import { cacheLife, cacheTag } from "next/cache";
import { createServerClient } from "@/packages/trpc/api";
import { blogCacheTags } from "@/packages/trpc/api/utils/blog-cache-tags";
import { EnableStatus } from "@/packages/trpc/api/types/enable.status";

/**
 * 获取站点设置（缓存）。
 * 用于友情链接页面文案与 SEO 信息。
 */
export async function getCachedSetting() {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.setting());
  const serverClient = await createServerClient();
  return serverClient.setting.index();
}

/**
 * 获取友情链接列表（缓存）。
 */
export async function getCachedLinks() {
  "use cache";
  cacheLife("swrFixed");
  cacheTag(blogCacheTags.links());
  const serverClient = await createServerClient();
  return serverClient.link.index({
    limit: 999,
    status: [EnableStatus.ENABLE],
  });
}
