import "server-only";
import { parseEnumValue, requireWriteResult } from "@/lib/db/value-validation";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { observeDbOperation } from "@/lib/observability/server";
import { PostStatus } from "@/features/post/post-status";
import { toPostInsertValues, toPostUpdateValues } from "./post-transforms";
import {
  patchPostTranslationRows,
  sanitizePostTranslationInput,
  toPostTranslationRows,
  type PostTranslationInput,
} from "./post-translations";
import type { PostInsert, PostUpdate, PostTagUpdate } from "../schema";
import type { PublicContentInvalidator } from "@/lib/cache/public-content-invalidator";
import { DomainError } from "@/lib/errors/domain-error";
import { getPostPublishStatus, getPostWithdrawStatus } from "../rules";

export async function createPost(
  db: Database,
  input: PostInsert,
  authorId: string,
  invalidator: PublicContentInvalidator,
) {
  const post = await observeDbOperation("post.create", "transaction", () =>
    db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.post)
        .values(toPostInsertValues(input, authorId))
        .returning();
      const result = requireWriteResult(created, "create", "post");
      const translations = toPostTranslationRows(
        result.id,
        sanitizePostTranslationInput(input),
      );
      if (translations.length) {
        await tx.insert(schema.postTranslation).values(translations);
      }
      return result;
    }),
  );
  const publicSync = await invalidator.invalidate({
    contents: [{ id: post.id, type: "post" }],
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...post, publicSync: publicSync.state };
}

export async function destroyPosts(
  db: Database,
  ids: string[],
  invalidator: PublicContentInvalidator,
) {
  await observeDbOperation("post.destroy", "delete", () =>
    db.delete(schema.post).where(inArray(schema.post.id, ids)),
  );
  const result = { success: true } as const;
  const publicSync = await invalidator.invalidate({
    contents: ids.map((id) => ({ id, type: "post" })),
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}

export async function updatePost(
  db: Database,
  input: PostUpdate,
  invalidator: PublicContentInvalidator,
) {
  // input.status 是目标状态；迁移规则依据数据库当前状态，状态不变时仍允许普通内容编辑。
  if (input.status !== undefined) {
    const [post] = await observeDbOperation("post.update", "select", () =>
      db
        .select({ status: schema.post.status })
        .from(schema.post)
        .where(eq(schema.post.id, input.id))
        .limit(1),
    );
    const currentStatus = post
      ? parseEnumValue(post.status, Object.values(PostStatus), "post.status")
      : null;
    if (!currentStatus) throw new DomainError("文章不存在", "POST_NOT_FOUND");
    if (currentStatus !== input.status) {
      if (input.status === PostStatus.PUBLISHED) {
        input = {
          ...input,
          status: getPostPublishStatus(input.id, currentStatus),
        };
      } else if (input.status === PostStatus.DRAFT) {
        input = {
          ...input,
          status: getPostWithdrawStatus(input.id, currentStatus),
        };
      } else {
        throw new DomainError(
          `文章不支持变更为 ${input.status}`,
          "INVALID_POST_STATUS",
        );
      }
    }
  }
  const {
    id,
    title,
    content,
    excerpt,
    galleryLocation,
    quoteAuthor,
    quoteContent,
    ...rest
  } = input;
  const translationInput = sanitizePostTranslationInput({
    title,
    content,
    excerpt,
    galleryLocation,
    quoteAuthor,
    quoteContent,
  } satisfies PostTranslationInput);
  const hasTranslationChanges = Object.values(translationInput).some(
    (value) => value !== undefined,
  );
  const post = await observeDbOperation("post.update", "transaction", () =>
    db.transaction(async (tx) => {
      // 主记录时间戳与各语言内容同事务提交，避免部分翻译成功却报告整次保存失败。
      const parentValues = toPostUpdateValues(rest);
      if (hasTranslationChanges) {
        parentValues.updatedAt = new Date().toISOString();
      }
      const [updated] = Object.keys(parentValues).length
        ? await tx
            .update(schema.post)
            .set(parentValues)
            .where(eq(schema.post.id, id))
            .returning()
        : await tx
            .select()
            .from(schema.post)
            .where(eq(schema.post.id, id))
            .limit(1);
      if (updated && hasTranslationChanges) {
        const current = await tx
          .select()
          .from(schema.postTranslation)
          .where(eq(schema.postTranslation.postId, id));
        const next = patchPostTranslationRows(id, current, translationInput);
        await tx
          .delete(schema.postTranslation)
          .where(eq(schema.postTranslation.postId, id));
        if (next.length) await tx.insert(schema.postTranslation).values(next);
      }
      return updated;
    }),
  );
  const result = requireWriteResult(post, "update", "post");
  const publicSync = await invalidator.invalidate({
    contents: [{ id: input.id, type: "post" }],
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}

export async function updatePostTags(
  db: Database,
  input: PostTagUpdate,
  invalidator: PublicContentInvalidator,
) {
  await observeDbOperation("post.update-tags", "transaction", () =>
    db.transaction(async (tx) => {
      await tx
        .delete(schema.postTag)
        .where(
          and(
            eq(schema.postTag.postId, input.postId),
            eq(schema.postTag.type, input.type),
          ),
        );
      if (input.tagIds.length)
        await tx.insert(schema.postTag).values(
          [...new Set(input.tagIds)].map((tagId) => ({
            postId: input.postId,
            tagId,
            type: input.type,
          })),
        );
    }),
  );
  const result = { success: true } as const;
  const publicSync = await invalidator.invalidate({
    contents: [{ id: input.postId, type: "post" }],
    refreshLayout: true,
    refreshPostIndex: true,
    refreshSitemap: true,
  });
  return { ...result, publicSync: publicSync.state };
}

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
