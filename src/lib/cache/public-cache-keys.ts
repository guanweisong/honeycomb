import { CacheNamespace } from "./cache-namespaces";

export const POST_CACHE_NAMESPACE = CacheNamespace.postIndex;
export const POST_CACHE_VERSION_KEY = "cache:post:index:version";
export const SITEMAP_CACHE_TAG = "public.sitemap";
export const PUBLIC_LAYOUT_CACHE_TAG = "public.layout";
export const POST_INDEX_CACHE_TAG = "public.post-index";

export function getPostDetailCacheTag(id: string) {
  return `public.post.${id}`;
}

export function getPageDetailCacheTag(id: string) {
  return `public.page.${id}`;
}
