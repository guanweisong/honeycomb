import "server-only";

import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PostStatus } from "@/packages/domain/content/post-status";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import {
  getCacheJSON,
  getCacheVersion,
  setCacheJSON,
} from "@/packages/infrastructure/cache/upstash-cache";
import type { PostListQueryInput } from "./post-queries";
import { getPostList } from "./post-queries";

const POST_INDEX_CACHE_NAMESPACE = "post.index";
const POST_INDEX_CACHE_VERSION_KEY = "cache:post:index:version";

/** 查询公开文章列表并使用版本化缓存。 */
export async function getCachedPostList(
  db: Database,
  input: PostListQueryInput,
) {
  const cacheVersion = await getCacheVersion(
    POST_INDEX_CACHE_NAMESPACE,
    POST_INDEX_CACHE_VERSION_KEY,
  );
  const cacheKey = `post:index:v${cacheVersion}:${JSON.stringify(input)}`;
  const cached = await getCacheJSON<Awaited<ReturnType<typeof getPostList>>>(
    POST_INDEX_CACHE_NAMESPACE,
    cacheKey,
  );
  if (cached) return cached;
  const result = await getPostList(db, input, "PUBLISHED_ONLY");
  await setCacheJSON(POST_INDEX_CACHE_NAMESPACE, cacheKey, result, 60 * 60);
  return result;
}

/** 查询指定分类下的公开随机文章。 */
export async function getRandomPostsByCategory(
  db: Database,
  categoryId: string,
) {
  return observeDbOperation("post.random-by-category", "select", () =>
    db
      .select({
        id: schema.post.id,
        title: schema.post.title,
        quoteContent: schema.post.quoteContent,
      })
      .from(schema.post)
      .where(
        and(
          eq(schema.post.categoryId, categoryId),
          eq(schema.post.status, PostStatus.PUBLISHED),
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(10),
  );
}

/** 查询公开文章所属分类。 */
export async function getPublishedPostCategoryId(db: Database, id: string) {
  const [result] = await observeDbOperation("post.category-id", "select", () =>
    db
      .select({ categoryId: schema.post.categoryId })
      .from(schema.post)
      .where(
        and(
          eq(schema.post.id, id),
          eq(schema.post.status, PostStatus.PUBLISHED),
        ),
      ),
  );
  return result;
}
