import "server-only";
import { PostListResultSchema } from "../post-read-model";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { PostStatus } from "@/features/post/post-status";
import { observeDbOperation } from "@/lib/observability/server";
import { assembleLocalizedField } from "@/lib/db/translation-values";
import {
  getCacheJSON,
  getCacheVersion,
  setCacheJSON,
} from "@/lib/cache/upstash-cache";
import type { PostListInput } from "../types";
import { listPosts } from "./post-queries";
import {
  POST_CACHE_NAMESPACE as namespace,
  POST_CACHE_VERSION_KEY as versionKey,
} from "@/lib/cache/public-cache-keys";
export async function getCachedPostList(db: Database, input: PostListInput) {
  let key: string | undefined;
  try {
    const version = await getCacheVersion(namespace, versionKey);
    key = `post:index:v${version}:${JSON.stringify(input)}`;
    const cached = await getCacheJSON(namespace, key, (value) =>
      PostListResultSchema.parse(value),
    );
    if (cached) return cached;
  } catch {
    // Cache failures are observed by the adapter; public reads still use DB.
    key = undefined;
  }
  const result = await listPosts(db, input, "PUBLISHED_ONLY");
  if (key !== undefined) {
    try {
      await setCacheJSON(namespace, key, result, 60 * 60);
    } catch {
      // A failed cache fill must not discard a successful database read.
    }
  }
  return result;
}

export async function getRandomPostsByCategory(
  db: Database,
  categoryId: string,
) {
  const posts = await observeDbOperation(
    "post.random-by-category",
    "select",
    () =>
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
    .where(
      inArray(
        schema.postTranslation.postId,
        posts.map((post) => post.id),
      ),
    );
  return posts.map((post) => {
    const rows = translations.filter((row) => row.postId === post.id);
    return {
      id: post.id,
      title: assembleLocalizedField(rows, (row) => row.title),
      quoteContent: assembleLocalizedField(rows, (row) => row.quoteContent),
    };
  });
}

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
  return result ? { categoryId: result.categoryId ?? undefined } : result;
}
