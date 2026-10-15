import "server-only";
import { decodeCachedPostList } from "./post-cache-dto";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";
import { PostStatus } from "@/packages/domain/content/post-status";
import { observeDbOperation } from "@/packages/infrastructure/observability/server";
import { assembleLocalizedField } from "@/packages/infrastructure/db/translation-values";
import {
  getCacheJSON,
  getCacheVersion,
  setCacheJSON,
} from "@/packages/infrastructure/cache/upstash-cache";
import type {
  PostQueryRepository,
  PostSpecialRepository,
} from "../application/repository";
export type { PostSpecialRepository } from "../application/repository";
import {
  POST_CACHE_NAMESPACE as namespace,
  POST_CACHE_VERSION_KEY as versionKey,
} from "@/packages/infrastructure/cache/public-cache-keys";
export function createPostSpecialRepository(
  db: Database,
  query: PostQueryRepository,
): PostSpecialRepository {
  return {
    async cachedList(input) {
      let key: string | undefined;
      try {
        const version = await getCacheVersion(namespace, versionKey);
        key = `post:index:v${version}:${JSON.stringify(input)}`;
        const cached = await getCacheJSON(namespace, key, decodeCachedPostList);
        if (cached) return cached;
      } catch {
        // Cache failures are observed by the adapter; public reads still use DB.
        key = undefined;
      }
      const result = await query.list(input, "PUBLISHED_ONLY");
      if (key !== undefined) {
        try {
          await setCacheJSON(namespace, key, result, 60 * 60);
        } catch {
          // A failed cache fill must not discard a successful database read.
        }
      }
      return result;
    },
    async randomByCategory(categoryId) {
      const posts = await observeDbOperation("post.random-by-category", "select", () =>
        db
          .select({ id: schema.post.id })
          .from(schema.post)
          .where(
            and(
              eq(schema.post.categoryId, categoryId),
              eq(schema.post.status, PostStatus.PUBLISHED),
            ),
          )
          .orderBy(sql`abs(random())`)
          .limit(10),
      );
      if (!posts.length) return [];
      const translations = await db
        .select()
        .from(schema.postTranslation)
        .where(inArray(schema.postTranslation.postId, posts.map((post) => post.id)));
      return posts.map((post) => {
        const rows = translations.filter((row) => row.postId === post.id);
        return {
          id: post.id,
          title: assembleLocalizedField(rows, (row) => row.title),
          quoteContent: assembleLocalizedField(rows, (row) => row.quoteContent),
        };
      });
    },
    async publishedCategoryId(id) {
      const [result] = await observeDbOperation(
        "post.category-id",
        "select",
        () =>
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
      return result ? { categoryId: result.categoryId ?? undefined } : result;
    },
  };
}
