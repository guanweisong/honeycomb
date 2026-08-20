import "server-only";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PostStatus } from "@/packages/domain/content/post-status";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { getCacheJSON, getCacheVersion, setCacheJSON } from "@/packages/infrastructure/cache/upstash-cache";
import type { PostQueryRepository, PostSpecialRepository } from "../repository";
export type { PostSpecialRepository } from "../repository";
const namespace = "post.index";
const versionKey = "cache:post:index:version";
export function createPostSpecialRepository(db: Database, query: PostQueryRepository): PostSpecialRepository {
  return {
    async cachedList(input) {
      const version = await getCacheVersion(namespace, versionKey);
      const key = `post:index:v${version}:${JSON.stringify(input)}`;
      const cached = await getCacheJSON<Awaited<ReturnType<PostQueryRepository["list"]>>>(namespace, key);
      if (cached) return cached;
      const result = await query.list(input, "PUBLISHED_ONLY");
      await setCacheJSON(namespace, key, result, 60 * 60);
      return result;
    },
    randomByCategory(categoryId) {
      return observeDbOperation("post.random-by-category", "select", () => db.select({ id: schema.post.id, title: schema.post.title, quoteContent: schema.post.quoteContent }).from(schema.post).where(and(eq(schema.post.categoryId, categoryId), eq(schema.post.status, PostStatus.PUBLISHED))).orderBy(sql`abs(random())`).limit(10));
    },
    async publishedCategoryId(id) { const [result] = await observeDbOperation("post.category-id", "select", () => db.select({ categoryId: schema.post.categoryId }).from(schema.post).where(and(eq(schema.post.id, id), eq(schema.post.status, PostStatus.PUBLISHED)))); return result ? { categoryId: result.categoryId ?? undefined } : result; },
  };
}
