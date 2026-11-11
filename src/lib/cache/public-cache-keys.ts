import { CacheNamespace } from "@/lib/cache/cache-namespaces";

export const POST_CACHE_NAMESPACE = CacheNamespace.postIndex;
export const POST_CACHE_VERSION_KEY = "cache:post:index:version";
export const SITEMAP_CACHE_TAG = "public.sitemap";
export const BLOG_LIST_CACHE_TAG = "public.blog-lists";
export const POST_DETAILS_CACHE_TAG = "public.post-details";
export const PAGE_DETAILS_CACHE_TAG = "public.page-details";

export function postDetailCacheTag(id: string) {
  return `public.post-detail:${id}`;
}

export function pageDetailCacheTag(id: string) {
  return `public.page-detail:${id}`;
}
