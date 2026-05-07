import { cacheLife, cacheTag } from "next/cache";
import { createServerClient } from "@/packages/trpc/api";
import { blogCacheTags } from "@/packages/trpc/api/utils/blog-cache-tags";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";

/**
 * 获取站点设置（缓存）。
 * 用于文章详情页 SEO 与基础文案。
 */
export async function getCachedSetting() {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.setting());
  const serverClient = await createServerClient();
  return serverClient.setting.index();
}

/**
 * 根据文章 ID 获取文章详情（缓存）。
 * @param id 文章 ID
 */
export async function getCachedPostDetail(id: string) {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.post(id));
  const serverClient = await createServerClient();
  return serverClient.post.detail({ id });
}

/**
 * 获取同分类随机文章（缓存）。
 * @param categoryId 分类 ID
 */
export async function getCachedRandomPostsByCategory(categoryId: string) {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.postCategory(categoryId));
  const serverClient = await createServerClient();
  return serverClient.post.getRandomByCategory({ categoryId });
}

/**
 * 获取评论列表（实时，不缓存）。
 * @param id 关联资源 ID
 * @param type 关联资源类型
 */
export async function getCommentListByRef(id: string, type: MenuType) {
  const serverClient = await createServerClient();
  return serverClient.comment.listByRef({ id, type });
}

/**
 * 增加文章阅读量（实时，不缓存）。
 * @param id 文章 ID
 */
export async function incrementPostViews(id: string) {
  const serverClient = await createServerClient();
  return serverClient.post.incrementViews({ id });
}
