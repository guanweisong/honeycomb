import "server-only";
import { createHash } from "node:crypto";
import { parseEnumValue, requireWriteResult } from "@/lib/db/value-validation";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { observeDbOperation } from "@/lib/observability/server";
import { PostStatus } from "@/features/post/post-status";
import { TagType } from "@/features/tag/tag-kind";
import { UserStatus } from "@/features/user/user";
import { can, Permission } from "@/lib/auth/permissions";
import { ApplicationError } from "@/lib/errors/application-error";
import { toPostInsertValues, toPostUpdateValues } from "./post-transforms";
import {
  groupPostTranslations,
  patchPostTranslationRows,
  sanitizePostTranslationInput,
  toPostTranslationRows,
} from "./post-translations";
import {
  PostDeleteSchema,
  PostInsertSchema,
  PostUpdateSchema,
} from "../schema";
import type {
  PostInsert,
  PostUpdate,
  PostDelete,
  PostRelationPatch,
} from "../schema";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { DomainError } from "@/lib/errors/domain-error";
import { getPostPublishStatus, getPostWithdrawStatus } from "../rules";
import { assertMediaReferencesReady } from "@/features/media/server/media-references";

type PostTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** 只重试回调尚未进入时的 BEGIN 锁竞争；业务写入或提交结果未知后绝不自动重放。 */
async function postTransaction<T>(
  db: Database,
  operation: (tx: PostTransaction) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    let entered = false;
    try {
      return await db.transaction((tx) => {
        entered = true;
        return operation(tx);
      });
    } catch (error) {
      const busyAtBegin =
        !entered &&
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "SQLITE_BUSY";
      if (!busyAtBegin) throw error;
      if (attempt >= 3)
        throw new ApplicationError(
          "CONFLICT",
          "保存暂时繁忙，请核对结果后重试",
        );
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
    }
  }
}
const relationRoles = {
  movieActorIds: TagType.ACTOR,
  movieDirectorIds: TagType.DIRECTOR,
  movieStyleIds: TagType.MOVIE_STYLE,
  galleryStyleIds: TagType.GALLERY_STYLE,
} as const;
const relationKeys = Object.keys(
  relationRoles,
) as (keyof typeof relationRoles)[];
function hasRelationPatch(input: PostRelationPatch) {
  return relationKeys.some((key) => input[key] !== undefined);
}
async function requireActor(
  tx: PostTransaction,
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
    throw new ApplicationError("FORBIDDEN", "当前账户无权保存此文章");
  }
}
async function patchRelations(
  tx: PostTransaction,
  id: string,
  input: PostRelationPatch,
) {
  for (const key of relationKeys) {
    const ids = input[key];
    if (ids === undefined) continue;
    const type = relationRoles[key];
    await tx
      .delete(schema.postTag)
      .where(and(eq(schema.postTag.postId, id), eq(schema.postTag.type, type)));
    if (ids.length)
      await tx
        .insert(schema.postTag)
        .values(
          [...new Set(ids)].map((tagId) => ({ postId: id, tagId, type })),
        );
  }
}
// 对已校验的原始意图求哈希，不使用清洗后或随后被编辑的存储内容。
function canonicalInput(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalInput).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, field]) => field !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, field]) => `${JSON.stringify(key)}:${canonicalInput(field)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
function safeResult(
  row: Pick<typeof schema.post.$inferSelect, "id" | "version">,
) {
  return { id: row.id, version: row.version };
}
async function invalidatePosts(
  invalidator: PublicContentInvalidator,
  ids: string[],
) {
  return invalidator.invalidate({
    contents: ids.map((id) => ({ id, type: "post" as const })),
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
}
/**
 * 原子创建文章及关联数据；同一作者的令牌仅允许重放相同原始意图，不覆盖后续编辑。
 * 公开缓存失效发生在提交后，publicSync 不代表数据库写入是否成功。
 */
export async function createPost(
  db: Database,
  input: PostInsert,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = PostInsertSchema.safeParse(input);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "文章保存输入不合法");
  input = parsed.data;
  const { creationToken, ...intent } = input;
  const creationInputHash = createHash("sha256")
    .update(canonicalInput(intent))
    .digest("hex");
  const result = await observeDbOperation("post.create", "transaction", () =>
    postTransaction(db, async (tx) => {
      await requireActor(tx, actorId, [
        Permission.postCreate,
        ...(hasRelationPatch(input) ? [Permission.postManageTags] : []),
      ]);
      const [created] = await tx
        .insert(schema.post)
        .values({
          ...toPostInsertValues(input, actorId),
          creationToken,
          creationInputHash,
        })
        .onConflictDoNothing({
          target: [schema.post.authorId, schema.post.creationToken],
        })
        .returning();
      if (!created) {
        const [existing] = await tx
          .select()
          .from(schema.post)
          .where(
            and(
              eq(schema.post.authorId, actorId),
              eq(schema.post.creationToken, creationToken),
            ),
          )
          .limit(1);
        if (!existing || existing.creationInputHash !== creationInputHash)
          throw new ApplicationError(
            "CONFLICT",
            "创建请求与原始内容不一致，请核对已创建文章",
          );
        return safeResult(existing);
      }
      const translations = toPostTranslationRows(
        created.id,
        sanitizePostTranslationInput(input),
      );
      await assertMediaReferencesReady(tx, {
        coverId: input.coverId,
        content: groupPostTranslations(translations).get(created.id)?.content,
      });
      if (translations.length)
        await tx.insert(schema.postTranslation).values(translations);
      await patchRelations(tx, created.id, input);
      return safeResult(created);
    }),
  );
  const publicSync = await invalidatePosts(invalidator, [result.id]);
  return { ...result, publicSync: publicSync.state };
}

/** 按当前作者核对创建结果；返回 null 仅表示当前无记录，不是永久保留的删除回执。 */
export async function getPostCreationResult(
  db: Database,
  creationToken: string,
  actorId: string,
) {
  return postTransaction(db, async (tx) => {
    await requireActor(tx, actorId, [Permission.postCreate]);
    const [result] = await tx
      .select({ id: schema.post.id, version: schema.post.version })
      .from(schema.post)
      .where(
        and(
          eq(schema.post.authorId, actorId),
          eq(schema.post.creationToken, creationToken),
        ),
      )
      .limit(1);
    return result ? safeResult(result) : null;
  });
}

/** 整批按版本删除；任一目标缺失或过期会回滚全批，不能退化为部分成功。 */
export async function destroyPosts(
  db: Database,
  input: PostDelete,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = PostDeleteSchema.safeParse(input);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "文章删除输入不合法");
  input = parsed.data;
  await observeDbOperation("post.destroy", "transaction", () =>
    postTransaction(db, async (tx) => {
      await requireActor(tx, actorId, [Permission.postDelete]);
      for (const item of input.items) {
        const [current] = await tx
          .select({ version: schema.post.version })
          .from(schema.post)
          .where(eq(schema.post.id, item.id))
          .limit(1);
        if (!current) throw new ApplicationError("NOT_FOUND", "文章不存在");
        if (current.version !== item.expectedVersion)
          throw new ApplicationError("CONFLICT", "文章已修改，请刷新后再删除");
        const [deleted] = await tx
          .delete(schema.post)
          .where(
            and(
              eq(schema.post.id, item.id),
              eq(schema.post.version, item.expectedVersion),
            ),
          )
          .returning({ id: schema.post.id });
        if (!deleted)
          throw new ApplicationError("CONFLICT", "文章已修改，请刷新后再删除");
      }
    }),
  );
  const publicSync = await invalidatePosts(
    invalidator,
    input.items.map(({ id }) => id),
  );
  return { success: true as const, publicSync: publicSync.state };
}

/** 在同一事务重新鉴权、校验版本与媒体引用，并原子提交正文及关联变更。 */
export async function updatePost(
  db: Database,
  input: PostUpdate,
  actorId: string,
  invalidator: PublicContentInvalidator,
) {
  const parsed = PostUpdateSchema.safeParse(input);
  if (!parsed.success)
    throw new ApplicationError("BAD_REQUEST", "文章保存输入不合法");
  input = parsed.data;
  const result = await observeDbOperation("post.update", "transaction", () =>
    postTransaction(db, async (tx) => {
      await requireActor(tx, actorId, [
        Permission.postUpdate,
        ...(hasRelationPatch(input) ? [Permission.postManageTags] : []),
      ]);
      const [current] = await tx
        .select()
        .from(schema.post)
        .where(eq(schema.post.id, input.id))
        .limit(1);
      if (!current) throw new ApplicationError("NOT_FOUND", "文章不存在");
      if (current.version !== input.expectedVersion)
        throw new ApplicationError(
          "CONFLICT",
          "文章已修改，请核对最新内容后重试",
        );
      const currentStatus = parseEnumValue(
        current.status,
        Object.values(PostStatus),
        "post.status",
      );
      let status = input.status;
      if (status !== undefined && status !== currentStatus) {
        if (status === PostStatus.PUBLISHED)
          status = getPostPublishStatus(input.id, currentStatus);
        else if (status === PostStatus.DRAFT)
          status = getPostWithdrawStatus(input.id, currentStatus);
        else
          throw new DomainError(
            `文章不支持变更为 ${status}`,
            "INVALID_POST_STATUS",
          );
      }
      const [updated] = await tx
        .update(schema.post)
        .set({
          ...toPostUpdateValues({ ...input, status }),
          version: sql`${schema.post.version} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(schema.post.id, input.id),
            eq(schema.post.version, input.expectedVersion),
          ),
        )
        .returning({ id: schema.post.id, version: schema.post.version });
      if (!updated)
        throw new ApplicationError(
          "CONFLICT",
          "文章已修改，请核对最新内容后重试",
        );
      const {
        title,
        content,
        excerpt,
        galleryLocation,
        quoteAuthor,
        quoteContent,
      } = input;
      const translationInput = sanitizePostTranslationInput({
        title,
        content,
        excerpt,
        galleryLocation,
        quoteAuthor,
        quoteContent,
      });
      const rows = await tx
        .select()
        .from(schema.postTranslation)
        .where(eq(schema.postTranslation.postId, input.id));
      const next = patchPostTranslationRows(
        input.id,
        rows,
        translationInput,
        input.removeLocales,
      );
      await assertMediaReferencesReady(tx, {
        coverId: input.coverId === undefined ? current.coverId : input.coverId,
        content: groupPostTranslations(next).get(input.id)?.content,
        previousContent: groupPostTranslations(rows).get(input.id)?.content,
      });
      if (
        Object.values(translationInput).some((value) => value !== undefined) ||
        input.removeLocales?.length
      ) {
        await tx
          .delete(schema.postTranslation)
          .where(eq(schema.postTranslation.postId, input.id));
        if (next.length) await tx.insert(schema.postTranslation).values(next);
      }
      await patchRelations(tx, input.id, input);
      return safeResult(requireWriteResult(updated, "update", "post"));
    }),
  );
  const publicSync = await invalidatePosts(invalidator, [result.id]);
  return { ...result, publicSync: publicSync.state };
}

/** 浏览计数不推进编辑版本或更新时间，避免公开访问使编辑器产生无意义冲突。 */
export async function incrementPostViews(db: Database, id: string) {
  const [post] = await observeDbOperation(
    "post.increment-views",
    "update",
    () =>
      db
        .update(schema.post)
        .set({
          views: sql`${schema.post.views} + 1`,
          updatedAt: sql`${schema.post.updatedAt}`,
        })
        .where(
          and(
            eq(schema.post.id, id),
            eq(schema.post.status, PostStatus.PUBLISHED),
          ),
        )
        .returning({ views: schema.post.views }),
  );
  return post;
}
