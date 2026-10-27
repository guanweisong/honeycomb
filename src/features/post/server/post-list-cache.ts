import "server-only";
import { PublicPostListResultSchema } from "@/features/post/schemas/post.read-model.schema";
import type { Database } from "@/lib/db/db";
import {
  getCacheJSON,
  getCacheVersion,
  setCacheJSON,
} from "@/lib/cache/upstash-cache";
import type { PostListInput } from "@/features/post/types/post.list-query";
import { listPublicPosts } from "@/features/post/server/post-queries";
import {
  POST_CACHE_NAMESPACE as namespace,
  POST_CACHE_VERSION_KEY as versionKey,
} from "@/lib/cache/public-cache-keys";
/**
 * 仅缓存公开文章投影；缓存命中仍按读模型解析，移除不属于公开契约的字段。
 * Redis 读取/解码/回填失败可退回数据库，但数据库失败不能伪装成空列表。
 */
export async function getCachedPostList(db: Database, input: PostListInput) {
  let key: string | undefined;
  try {
    const version = await getCacheVersion(namespace, versionKey);
    key = `post:index:v${version}:${JSON.stringify(input)}`;
    const cached = await getCacheJSON(namespace, key, (value) =>
      PublicPostListResultSchema.parse(value),
    );
    if (cached) return cached;
  } catch {
    // Cache failures are observed by the adapter; public reads still use DB.
    key = undefined;
  }
  const result = await listPublicPosts(db, input);
  if (key !== undefined) {
    try {
      await setCacheJSON(namespace, key, result, 60 * 60);
    } catch {
      // A failed cache fill must not discard a successful database read.
    }
  }
  return result;
}
