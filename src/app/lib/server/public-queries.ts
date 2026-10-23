import "server-only";

import { cache } from "react";
import { TRPCError } from "@trpc/server";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { createServerClient } from "@/app/_trpc/server";
import type { MenuType } from "@/features/menu/types/menu.type";
import { EnableStatus } from "@/lib/validation/enable-status";
import { MAX_PAGE_SIZE } from "@/lib/validation/resource-limits";
import type { PostListQueryInput } from "@/features/post/types/post.list-query";
import {
  getPageDetailCacheTag,
  getPostDetailCacheTag,
  POST_INDEX_CACHE_TAG,
  PUBLIC_LAYOUT_CACHE_TAG,
} from "@/lib/cache/public-cache-keys";

const cachedClientOptions = {
  requestContext: { requestId: "next-public-cache-fill" },
  skipRequestObservability: true,
} as const;

async function createCachedPublicClient() {
  return createServerClient(undefined, cachedClientOptions);
}

/** 逐页读取友情链接，保留完整公开列表并遵守单次查询上限。 */
async function getCachedPublicLinks() {
  "use cache: remote";
  cacheLife("max");
  cacheTag(PUBLIC_LAYOUT_CACHE_TAG);

  const client = await createCachedPublicClient();
  const input = { limit: MAX_PAGE_SIZE, status: [EnableStatus.ENABLE] };
  const first = await client.link.index({ ...input, page: 1 });
  const list = [...first.list];
  for (let page = 2; page <= Math.ceil(first.total / MAX_PAGE_SIZE); page++) {
    const result = await client.link.index({ ...input, page });
    list.push(...result.list);
    if (result.list.length === 0) break;
  }
  return { list, total: first.total };
}

async function getCachedPublicSetting() {
  "use cache: remote";
  cacheLife("max");
  cacheTag(PUBLIC_LAYOUT_CACHE_TAG);
  const client = await createCachedPublicClient();
  return client.setting.index();
}

async function getCachedPublicMenu() {
  "use cache: remote";
  cacheLife("max");
  cacheTag(PUBLIC_LAYOUT_CACHE_TAG);
  const client = await createCachedPublicClient();
  return client.menu.index();
}

async function getCachedPublicPostDetail(id: string) {
  "use cache: remote";
  cacheLife("max");
  cacheTag(POST_INDEX_CACHE_TAG, getPostDetailCacheTag(id));
  const client = await createCachedPublicClient();
  try {
    return await client.post.detail({ id });
  } catch (error) {
    // Cache transport does not preserve custom error prototypes or properties.
    // Carry expected absence as data; the route calls notFound outside cache.
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

async function getCachedPublicPageDetail(id: string) {
  "use cache: remote";
  cacheLife("max");
  cacheTag(getPageDetailCacheTag(id));
  const client = await createCachedPublicClient();
  return client.page.detail({ id });
}

async function getCachedPublicPostList(input: PostListQueryInput) {
  "use cache: remote";
  cacheLife("max");
  cacheTag(POST_INDEX_CACHE_TAG);
  const client = await createCachedPublicClient();
  return client.post.index(input);
}

async function getCachedRandomPosts(categoryId: string) {
  "use cache: remote";
  cacheLife("max");
  cacheTag(POST_INDEX_CACHE_TAG);
  const client = await createCachedPublicClient();
  return client.post.getRandomByCategory({ categoryId });
}

async function getCachedPublicTag(id: string) {
  "use cache: remote";
  cacheLife("max");
  cacheTag(POST_INDEX_CACHE_TAG);
  const client = await createCachedPublicClient();
  return (await client.tag.index({ limit: 1, page: 1, id: [id] })).list[0];
}

async function getCachedPublicAuthor(id: string) {
  "use cache: remote";
  cacheLife("max");
  cacheTag(POST_INDEX_CACHE_TAG);
  const client = await createCachedPublicClient();
  return client.user.detail({ id });
}

export const getPublicLinks = cache(getCachedPublicLinks);
export const getPublicSetting = cache(getCachedPublicSetting);
export const getPublicMenu = cache(getCachedPublicMenu);
export const getPublicPostDetail = cache(getCachedPublicPostDetail);
export const getPublicPageDetail = cache(getCachedPublicPageDetail);
export const getPublicPostList = cache(getCachedPublicPostList);
export const getPublicRandomPosts = cache(getCachedRandomPosts);
export const getPublicTag = cache(getCachedPublicTag);
export const getPublicAuthor = cache(getCachedPublicAuthor);

/** 评论保留请求内去重，避免共享缓存延迟展示新提交的内容。 */
export const getPublicComments = cache(async (id: string, type: MenuType) => {
  await connection();
  const client = await createServerClient();
  return client.comment.listByRef({ id, type });
});
