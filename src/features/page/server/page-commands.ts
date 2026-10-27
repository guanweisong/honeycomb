import "server-only";
import {
  transactionWithBeginRetry,
  type DatabaseTransaction,
} from "@/lib/db/transaction-begin-retry";
import { assertMediaReferencesExist } from "@/features/media/server/media-references";
import { bumpMenuRevisionForPageDeletion } from "@/features/menu/server/menu-revisions";
import { hashCanonicalInput } from "@/lib/canonical-input-hash";
import { parseEnumValue } from "@/lib/db/value-validation";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { PageStatus } from "@/features/page/types/page.status";
import { observeDbOperation } from "@/lib/observability/server";
import { toPageInsertValues, toPageUpdateValues } from "@/features/page/server/page-transforms";
import { supportedLanguages } from "@/lib/i18n/i18n";
import { sanitizeOptionalI18nHtml } from "@/lib/security/sanitize-html";
import {
  groupPageTranslations,
  toPageTranslationRows,
} from "@/features/page/server/page-translations";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { PageUpdateSchema } from "@/features/page/schemas/page.update.schema";
import { PageDeleteSchema } from "@/features/page/schemas/page.delete.schema";
import type { PageInsert } from "@/features/page/types/page.insert";
import type { PageUpdate } from "@/features/page/types/page.update";
import type { PageDelete } from "@/features/page/types/page.delete";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { DomainError } from "@/lib/errors/domain-error";
import { ApplicationError } from "@/lib/errors/application-error";
import { UserStatus } from "@/features/user/types/user.status";
import { can, Permission } from "@/lib/auth/permissions";
import {
  getPagePublishStatus,
  getPageWithdrawStatus,
} from "@/features/page/rules/page-publication";

const busyMessage = "保存暂时繁忙，请核对结果后重试";

async function requireActor(
  tx: DatabaseTransaction,
  actorId: string,
  permissions: Permission[],
) {
  const [actor] = await tx
    .select({ level: schema.user.level, status: schema.user.status })
    .from(schema.user)
    .where(eq(schema.user.id, actorId))
    .limit(1);
  if (
    !actor ||
    actor.status !== UserStatus.ENABLE ||
    permissions.some((permission) => !can(actor.level, permission))
  ) {
    throw new ApplicationError("FORBIDDEN", "当前账户无权保存此页面");
  }
}

function safeResult(
  row: Pick<typeof schema.page.$inferSelect, "id" | "version">,
) {
  return { id: row.id, version: row.version };
}
async function invalidatePages(
  invalidator: PublicContentInvalidator,
  ids: string[],
) {
  return invalidator.invalidate({
    contents: ids.map((id) => ({ id, type: "page" as const })),
    refreshLayout: true,
    refreshSitemap: true,
  });
}
/**
 * 原子创建页面及关联数据；同一作者的令牌仅允许重放相同原始意图，不覆盖后续编辑。
 * 公开缓存失效发生在提交后，publicSync 不代表数据库写入是否成功。
 */
export async function createPage(
  db: Database,
  input: PageInsert,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = PageInsertSchema.safeParse(input);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "页面创建输入不合法");
  input = parsed.data;
  const { creationToken, ...intent } = input;
  const creationInputHash = hashCanonicalInput(intent);
  const result = await observeDbOperation("page.create", "transaction", () =>
    transactionWithBeginRetry(db, busyMessage, async (tx) => {
      await requireActor(tx, actorId, [Permission.pageCreate]);
      const [created] = await tx
        .insert(schema.page)
        .values({
          ...toPageInsertValues(input, actorId),
          creationToken,
          creationInputHash,
        })
        .onConflictDoNothing({
          target: [schema.page.authorId, schema.page.creationToken],
        })
        .returning();
      if (!created) {
        const [existing] = await tx
          .select()
          .from(schema.page)
          .where(
            and(
              eq(schema.page.authorId, actorId),
              eq(schema.page.creationToken, creationToken),
            ),
          )
          .limit(1);
        if (!existing || existing.creationInputHash !== creationInputHash)
          throw new ApplicationError(
            "CONFLICT",
            "创建请求与原始内容不一致，请核对已创建页面",
          );
        return safeResult(existing);
      }
      const sanitizedContent = sanitizeOptionalI18nHtml(input.content);
      await assertMediaReferencesExist(tx, { content: sanitizedContent });
      await tx
        .insert(schema.pageTranslation)
        .values(
          toPageTranslationRows(created.id, input.title, sanitizedContent),
        );
      return safeResult(created);
    }),
  );
  const publicSync = await invalidatePages(invalidator, [result.id]);
  return { ...result, publicSync: publicSync.state };
}

/** 按当前作者核对创建结果；返回 null 仅表示当前无记录，不是永久保留的删除回执。 */
export async function getPageCreationResult(
  db: Database,
  creationToken: string,
  actorId: string,
) {
  return transactionWithBeginRetry(db, busyMessage, async (tx) => {
    await requireActor(tx, actorId, [Permission.pageCreate]);
    const [result] = await tx
      .select({ id: schema.page.id, version: schema.page.version })
      .from(schema.page)
      .where(
        and(
          eq(schema.page.authorId, actorId),
          eq(schema.page.creationToken, creationToken),
        ),
      )
      .limit(1);
    return result ? safeResult(result) : null;
  });
}

/** 整批按版本删除；任一目标缺失或过期会回滚全批，不能退化为部分成功。 */
export async function destroyPages(
  db: Database,
  input: PageDelete,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = PageDeleteSchema.safeParse(input);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "页面删除输入不合法");
  input = parsed.data;
  await observeDbOperation("page.destroy", "transaction", () =>
    transactionWithBeginRetry(db, busyMessage, async (tx) => {
      await requireActor(tx, actorId, [Permission.pageDelete]);
      await bumpMenuRevisionForPageDeletion(
        tx,
        input.items.map((item) => item.id),
      );
      for (const item of input.items) {
        const [current] = await tx
          .select({ version: schema.page.version })
          .from(schema.page)
          .where(eq(schema.page.id, item.id))
          .limit(1);
        if (!current) throw new ApplicationError("NOT_FOUND", "页面不存在");
        if (current.version !== item.expectedVersion)
          throw new ApplicationError("CONFLICT", "页面已修改，请刷新后再删除");
        const [deleted] = await tx
          .delete(schema.page)
          .where(
            and(
              eq(schema.page.id, item.id),
              eq(schema.page.version, item.expectedVersion),
            ),
          )
          .returning({ id: schema.page.id });
        if (!deleted)
          throw new ApplicationError("CONFLICT", "页面已修改，请刷新后再删除");
      }
    }),
  );
  const publicSync = await invalidatePages(
    invalidator,
    input.items.map(({ id }) => id),
  );
  return { success: true as const, publicSync: publicSync.state };
}

/** 在同一事务重新鉴权、校验版本与媒体引用，并原子提交正文及关联变更。 */
export async function updatePage(
  db: Database,
  input: PageUpdate,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = PageUpdateSchema.safeParse(input);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "页面更新输入不合法");
  input = parsed.data;
  const result = await observeDbOperation("page.update", "transaction", () =>
    transactionWithBeginRetry(db, busyMessage, async (tx) => {
      await requireActor(tx, actorId, [Permission.pageUpdate]);
      const [current] = await tx
        .select()
        .from(schema.page)
        .where(eq(schema.page.id, input.id))
        .limit(1);
      if (!current) throw new ApplicationError("NOT_FOUND", "页面不存在");
      if (current.version !== input.expectedVersion)
        throw new ApplicationError(
          "CONFLICT",
          "页面已修改，请核对最新内容后重试",
        );
      const currentStatus = parseEnumValue(
        current.status,
        Object.values(PageStatus),
        "page.status",
      );
      let status = input.status;
      if (status !== undefined && status !== currentStatus) {
        if (status === PageStatus.PUBLISHED)
          status = getPagePublishStatus(input.id, currentStatus);
        else if (status === PageStatus.DRAFT)
          status = getPageWithdrawStatus(input.id, currentStatus);
        else
          throw new DomainError(
            `页面不支持变更为 ${status}`,
            "INVALID_PAGE_STATUS",
          );
      }
      const { id, title, content } = input;
      const previousRows = await tx
        .select()
        .from(schema.pageTranslation)
        .where(eq(schema.pageTranslation.pageId, id));
      const previousContent =
        groupPageTranslations(previousRows).get(id)?.content;
      const sanitizedContent =
        content === undefined ? undefined : sanitizeOptionalI18nHtml(content);
      await assertMediaReferencesExist(tx, {
        content: content === undefined ? previousContent : sanitizedContent,
        previousContent,
      });

      const [updated] = await tx
        .update(schema.page)
        .set({
          ...toPageUpdateValues({ ...input, status }),
          version: sql`${schema.page.version} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(schema.page.id, id),
            eq(schema.page.version, input.expectedVersion),
          ),
        )
        .returning({ id: schema.page.id, version: schema.page.version });
      if (!updated)
        throw new ApplicationError(
          "CONFLICT",
          "页面已修改，请核对最新内容后重试",
        );
      if (title !== undefined || content !== undefined) {
        for (const locale of supportedLanguages) {
          if (title !== undefined && sanitizedContent !== undefined) {
            await tx
              .insert(schema.pageTranslation)
              .values({
                pageId: id,
                locale,
                title: title[locale],
                content: sanitizedContent[locale],
              })
              .onConflictDoUpdate({
                target: [
                  schema.pageTranslation.pageId,
                  schema.pageTranslation.locale,
                ],
                set: {
                  title: title[locale],
                  content: sanitizedContent[locale],
                },
              });
          } else {
            await tx
              .update(schema.pageTranslation)
              .set({
                ...(title !== undefined ? { title: title[locale] } : {}),
                ...(sanitizedContent !== undefined
                  ? { content: sanitizedContent[locale] }
                  : {}),
              })
              .where(
                and(
                  eq(schema.pageTranslation.pageId, id),
                  eq(schema.pageTranslation.locale, locale),
                ),
              );
          }
        }
      }

      return safeResult(updated);
    }),
  );
  const publicSync = await invalidatePages(invalidator, [result.id]);
  return { ...result, publicSync: publicSync.state };
}
/** 浏览计数不推进编辑版本或更新时间，避免公开访问使编辑器产生无意义冲突。 */
export async function incrementPageViews(db: Database, id: string) {
  const [page] = await observeDbOperation(
    "page.increment-views",
    "update",
    () =>
      db
        .update(schema.page)
        .set({
          views: sql`${schema.page.views} + 1`,
          updatedAt: sql`${schema.page.updatedAt}`,
        })
        .where(
          and(
            eq(schema.page.id, id),
            eq(schema.page.status, PageStatus.PUBLISHED),
          ),
        )
        .returning({ views: schema.page.views }),
  );
  return page;
}
