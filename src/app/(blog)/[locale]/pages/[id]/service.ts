import { cacheLife, cacheTag } from "next/cache";
import { createServerClient } from "@/packages/trpc/api";
import { blogCacheTags } from "@/packages/trpc/api/utils/blog-cache-tags";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";

/**
 * 获取站点设置（缓存）。
 * 用于独立页面详情 SEO 与基础文案。
 */
export async function getCachedSetting() {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.setting());
  const serverClient = await createServerClient();
  return serverClient.setting.index();
}

/**
 * 根据页面 ID 获取页面详情（缓存）。
 * @param id 页面 ID
 */
export async function getCachedPageDetail(id: string) {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.page(id));
  const serverClient = await createServerClient();
  return serverClient.page.detail({ id });
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
 * 增加独立页面阅读量（实时，不缓存）。
 * @param id 页面 ID
 */
export async function incrementPageViews(id: string) {
  const serverClient = await createServerClient();
  return serverClient.page.incrementViews({ id });
}
