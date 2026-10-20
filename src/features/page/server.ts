import "server-only";
import { parseEnumValue, requireWriteResult } from "@/lib/db/value-validation";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { PageStatus } from "@/features/page/page-status";
import { observeDbOperation } from "@/lib/observability/server";
import {
  toPageInsertValues,
  toPageUpdateValues,
} from "./server/page-transforms";
import { supportedLanguages } from "@/lib/i18n/i18n";
import { sanitizeOptionalI18nHtml } from "@/lib/security/sanitize-html";
import { toPageTranslationRows } from "./server/page-translations";

import type { PageInsert, PageUpdate } from "./schema";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { DomainError } from "@/lib/errors/domain-error";
import { getPagePublishStatus, getPageWithdrawStatus } from "./rules";

export async function createPage(
  db: Database,
  input: PageInsert,
  authorId: string,
  invalidator: PublicContentInvalidator,
) {
  const page = await observeDbOperation("page.create", "transaction", () =>
    db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.page)
        .values(toPageInsertValues(input, authorId))
        .returning();
      const result = requireWriteResult(created, "create", "page");
      await tx
        .insert(schema.pageTranslation)
        .values(
          toPageTranslationRows(
            result.id,
            input.title,
            sanitizeOptionalI18nHtml(input.content),
          ),
        );
      return result;
    }),
  );
  const publicSync = await invalidator.invalidate({
    contents: [{ id: page.id, type: "page" }],
    refreshLayout: true,
    refreshSitemap: true,
  });
  return { ...page, publicSync: publicSync.state };
}

export async function destroyPages(
  db: Database,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  await observeDbOperation("page.destroy", "delete", () =>
    db.delete(schema.page).where(inArray(schema.page.id, ids)),
  );
  const result = { success: true } as const;
  const publicSync = await invalidator.invalidate({
    contents: ids.map((id) => ({ id, type: "page" })),
    refreshLayout: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}

export async function updatePage(
  db: Database,
  input: PageUpdate,
  invalidator: PublicContentInvalidator,
) {
  // input.status 是目标状态；迁移规则依据数据库当前状态，状态不变时仍允许普通内容编辑。
  if (input.status !== undefined) {
    const [page] = await observeDbOperation("page.update", "select", () =>
      db
        .select({ status: schema.page.status })
        .from(schema.page)
        .where(eq(schema.page.id, input.id))
        .limit(1),
    );
    const currentStatus = page
      ? parseEnumValue(page.status, Object.values(PageStatus), "page.status")
      : null;
    if (!currentStatus) throw new DomainError("页面不存在", "PAGE_NOT_FOUND");
    if (currentStatus !== input.status) {
      if (input.status === PageStatus.PUBLISHED) {
        input = {
          ...input,
          status: getPagePublishStatus(input.id, currentStatus),
        };
      } else if (input.status === PageStatus.DRAFT) {
        input = {
          ...input,
          status: getPageWithdrawStatus(input.id, currentStatus),
        };
      } else {
        throw new DomainError(
          `页面不支持变更为 ${input.status}`,
          "INVALID_PAGE_STATUS",
        );
      }
    }
  }
  const { id, title, content, ...rest } = input;
  const hasTranslationChanges = title !== undefined || content !== undefined;
  const page = await observeDbOperation("page.update", "transaction", () =>
    db.transaction(async (tx) => {
      // 主记录时间戳与各语言内容同事务提交，避免部分翻译成功却报告整次保存失败。
      const parentValues = toPageUpdateValues(rest);
      if (hasTranslationChanges) {
        parentValues.updatedAt = new Date().toISOString();
      }
      const [updated] = Object.keys(parentValues).length
        ? await tx
            .update(schema.page)
            .set(parentValues)
            .where(eq(schema.page.id, id))
            .returning()
        : await tx
            .select()
            .from(schema.page)
            .where(eq(schema.page.id, id))
            .limit(1);
      if (updated && hasTranslationChanges) {
        const sanitizedContent =
          content === undefined ? undefined : sanitizeOptionalI18nHtml(content);
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
      return updated;
    }),
  );
  const result = requireWriteResult(page, "update", "page");
  const publicSync = await invalidator.invalidate({
    contents: [{ id: input.id, type: "page" }],
    refreshLayout: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}

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
