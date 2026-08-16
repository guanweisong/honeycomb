import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { bumpCacheVersion } from "@/packages/infrastructure/cache/upstash-cache";
import { TagType } from "@/packages/domain/content/tag";
import { PostStatus } from "@/packages/domain/content/post-status";
import {
  toPostInsertValues,
  toPostUpdateValues,
  type PostCommandInput,
} from "./post-transforms";

const POST_INDEX_CACHE_VERSION_KEY = "cache:post:index:version";
const POST_INDEX_CACHE_NAMESPACE = "post.index";

async function invalidatePostIndex() {
  await bumpCacheVersion(
    POST_INDEX_CACHE_NAMESPACE,
    POST_INDEX_CACHE_VERSION_KEY,
  );
}

/** 创建文章并失效文章索引缓存。 */
export async function createPost(
  db: Database,
  input: PostCommandInput,
  authorId: string,
) {
  const [newPost] = await observeDbOperation("post.create", "insert", () =>
    db
      .insert(schema.post)
      .values(toPostInsertValues(input, authorId))
      .returning(),
  );
  await invalidatePostIndex();
  return newPost;
}

/** 批量删除文章并失效文章索引缓存。 */
export async function destroyPosts(db: Database, ids: string[]) {
  await observeDbOperation("post.destroy", "delete", () =>
    db.delete(schema.post).where(inArray(schema.post.id, ids)),
  );
  await invalidatePostIndex();
  return { success: true as const };
}

/** 更新文章并失效文章索引缓存。 */
export async function updatePost(
  db: Database,
  input: PostCommandInput & { id: string },
) {
  const { id, ...rest } = input;
  const [updatedPost] = await observeDbOperation("post.update", "update", () =>
    db
      .update(schema.post)
      .set(toPostUpdateValues(rest))
      .where(eq(schema.post.id, id))
      .returning(),
  );
  await invalidatePostIndex();
  return updatedPost;
}

/** 在事务中替换文章标签关联并失效文章索引缓存。 */
export async function updatePostTags(
  db: Database,
  input: { postId: string; tagIds: string[]; type: TagType },
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
      if (input.tagIds.length > 0) {
        await tx.insert(schema.postTag).values(
          input.tagIds.map((tagId) => ({
            postId: input.postId,
            tagId,
            type: input.type,
          })),
        );
      }
    }),
  );
  await invalidatePostIndex();
  return { success: true as const };
}

/** 增加公开文章浏览量。 */
export async function incrementPostViews(db: Database, id: string) {
  const [updatedPost] = await observeDbOperation(
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
  return updatedPost;
}
