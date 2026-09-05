import "server-only";
import {
  parseEnumValue,
  requireWriteResult,
} from "@/packages/infrastructure/db/value-validation";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { bumpCacheVersion } from "@/packages/infrastructure/cache/upstash-cache";
import { PostStatus } from "@/packages/domain/content/post-status";
import { toPostInsertValues, toPostUpdateValues } from "./post-transforms";
import type { PostCommandRepository } from "../application/repository";
import {
  POST_CACHE_VERSION_KEY as CACHE_VERSION_KEY,
  POST_CACHE_NAMESPACE as CACHE_NAMESPACE,
} from "./post-cache-keys";
async function invalidate() {
  await bumpCacheVersion(CACHE_NAMESPACE, CACHE_VERSION_KEY);
}
export function createPostCommandRepository(
  db: Database,
): PostCommandRepository {
  return {
    async create(input, authorId) {
      const [post] = await observeDbOperation("post.create", "insert", () =>
        db
          .insert(schema.post)
          .values(toPostInsertValues(input, authorId))
          .returning(),
      );
      const result = requireWriteResult(post, "create", "post");
      await invalidate();
      return result;
    },
    async destroy(ids) {
      await observeDbOperation("post.destroy", "delete", () =>
        db.delete(schema.post).where(inArray(schema.post.id, ids)),
      );
      await invalidate();
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
      const { id, ...rest } = input;
      const [post] = await observeDbOperation("post.update", "update", () =>
        db
          .update(schema.post)
          .set(toPostUpdateValues(rest))
          .where(eq(schema.post.id, id))
          .returning(),
      );
      const result = requireWriteResult(post, "update", "post");
      await invalidate();
      return result;
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
                input.tagIds.map((tagId) => ({
                  postId: input.postId,
                  tagId,
                  type: input.type,
                })),
              );
        }),
      );
      await invalidate();
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
