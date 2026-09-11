import "server-only";
import {
  parseEnumValue,
  requireWriteResult,
} from "@/packages/infrastructure/db/value-validation";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { PostStatus } from "@/packages/domain/content/post-status";
import { toPostInsertValues, toPostUpdateValues } from "./post-transforms";
import type { PostCommandRepository } from "../application/repository";
import {
  patchPostTranslationRows,
  sanitizePostTranslationInput,
  toPostTranslationRows,
  type PostTranslationInput,
} from "./post-translations";
export function createPostCommandRepository(
  db: Database,
): PostCommandRepository {
  return {
    async create(input, authorId) {
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
      return post;
    },
    async destroy(ids) {
      await observeDbOperation("post.destroy", "delete", () =>
        db.delete(schema.post).where(inArray(schema.post.id, ids)),
      );
      return { success: true } as const;
    },
    async findStatus(id) {
      const [post] = await observeDbOperation("post.update", "select", () =>
        db
          .select({ status: schema.post.status })
          .from(schema.post)
          .where(eq(schema.post.id, id))
          .limit(1),
      );
      return post
        ? parseEnumValue(post.status, Object.values(PostStatus), "post.status")
        : null;
    },
    async update(input) {
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
      const post = await observeDbOperation("post.update", "transaction", () =>
        db.transaction(async (tx) => {
          const parentValues = toPostUpdateValues(rest);
          const [updated] = Object.keys(parentValues).length
            ? await tx
                .update(schema.post)
                .set(parentValues)
                .where(eq(schema.post.id, id))
                .returning()
            : await tx.select().from(schema.post).where(eq(schema.post.id, id)).limit(1);
          if (updated && Object.values(translationInput).some((value) => value !== undefined)) {
            const current = await tx
              .select()
              .from(schema.postTranslation)
              .where(eq(schema.postTranslation.postId, id));
            const next = patchPostTranslationRows(id, current, translationInput);
            await tx.delete(schema.postTranslation).where(eq(schema.postTranslation.postId, id));
            if (next.length) await tx.insert(schema.postTranslation).values(next);
          }
          return updated;
        }),
      );
      return requireWriteResult(post, "update", "post");
    },
    async updateTags(input) {
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
            await tx
              .insert(schema.postTag)
              .values(
                [...new Set(input.tagIds)].map((tagId) => ({
                  postId: input.postId,
                  tagId,
                  type: input.type,
                })),
              );
        }),
      );
      return { success: true } as const;
    },
    async incrementViews(id) {
      const [post] = await observeDbOperation(
        "post.increment-views",
        "update",
        () =>
          db
            .update(schema.post)
            .set({ views: sql`${schema.post.views} + 1` })
            .where(
              and(
                eq(schema.post.id, id),
                eq(schema.post.status, PostStatus.PUBLISHED),
              ),
            )
            .returning({ views: schema.post.views }),
      );
      return post;
    },
  };
}
