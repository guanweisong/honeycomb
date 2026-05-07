import { cacheLife, cacheTag } from "next/cache";
import { createServerClient } from "@/packages/trpc/api";
import { blogCacheTags } from "@/packages/trpc/api/utils/blog-cache-tags";
import { PostListQueryInput } from "@/packages/trpc/api/modules/post/schemas/post.list.query.schema";

/**
 * 获取站点设置（缓存）。
 * 用于列表页渲染标题与描述等站点基础信息。
 */
export async function getCachedSetting() {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.setting());
  const serverClient = await createServerClient();
  return serverClient.setting.index();
}

/**
 * 获取菜单数据（缓存）。
 * 用于根据路径段解析分类名称和分类 ID。
 */
export async function getCachedMenu() {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.menu());
  const serverClient = await createServerClient();
  return serverClient.menu.index();
}

/**
 * 获取文章列表（缓存）。
 * @param queryParams 列表筛选与分页参数
 */
export async function getCachedPostList(queryParams: PostListQueryInput) {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.postList());
  const serverClient = await createServerClient();
  return serverClient.post.index(queryParams);
}

/**
 * 根据标签 ID 获取标签（缓存）。
 * @param id 标签 ID
 */
export async function getCachedTagNameById(id: string) {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.tag(id));
  const serverClient = await createServerClient();
  const matchedTag = (
    await serverClient.tag.index({ limit: 1, page: 1, id: [id] })
  )?.list?.[0];
  return matchedTag ?? null;
}

/**
 * 根据作者 ID 获取作者信息（缓存）。
 * @param id 作者 ID
 */
export async function getCachedAuthorById(id: string) {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.user(id));
  const serverClient = await createServerClient();
  return serverClient.user.detail({ id });
}
