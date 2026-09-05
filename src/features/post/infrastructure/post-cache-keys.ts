import { CacheNamespace } from "@/packages/infrastructure/cache/cache-namespaces";
/** 文章列表缓存的读写双方共享同一命名空间和版本键。 */
export const POST_CACHE_NAMESPACE = CacheNamespace.postIndex;
export const POST_CACHE_VERSION_KEY = "cache:post:index:version";
