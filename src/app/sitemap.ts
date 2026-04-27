import { MetadataRoute } from "next";
import { createServerClient } from "@/packages/trpc/api";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";
import { PageStatus } from "@/packages/trpc/api/modules/page/types/page.status";
import { MenuEntity } from "@/packages/trpc/api/modules/menu/types/menu.entity";
import { PageEntity } from "@/packages/trpc/api/modules/page/types/page.entity";
import { PostListItemEntity } from "@/packages/trpc/api/modules/post/types/post.entity";

/**
 * 生成 sitemap.xml 文件。
 * 用于告诉搜索引擎网站的所有页面结构。
 * @returns {Promise<MetadataRoute.Sitemap>} sitemap 配置对象。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const serverClient = await createServerClient();
  const [menu, posts, pages] = await Promise.all([
    serverClient.menu.index(),
    serverClient.post.index({ page: 1, limit: 1000, status: [PostStatus.PUBLISHED] }),
    serverClient.page.index({ page: 1, limit: 1000, status: [PageStatus.PUBLISHED] }),
  ]);

  const baseUrl = "https://www.guanweisong.com";

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/zh/list/category`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/list/category`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
  const toLastModified = (value: string | null) => new Date(value ?? Date.now());

  // 添加分类页面到 sitemap
  const categoryUrls: MetadataRoute.Sitemap = menu?.list?.map((item: MenuEntity) => [
    {
      url: `${baseUrl}/zh/list/category/${item.path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/list/category/${item.path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ]).flat() || [];

  // 添加文章详情页面到 sitemap
  const postUrls: MetadataRoute.Sitemap = posts?.list?.map((post: PostListItemEntity) => [
    {
      url: `${baseUrl}/zh/archives/${post.id}`,
      lastModified: toLastModified(post.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/en/archives/${post.id}`,
      lastModified: toLastModified(post.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ]).flat() || [];

  // 添加独立页面到 sitemap
  const pageUrls: MetadataRoute.Sitemap = pages?.list?.map((page: PageEntity) => [
    {
      url: `${baseUrl}/zh/pages/${page.id}`,
      lastModified: toLastModified(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/en/pages/${page.id}`,
      lastModified: toLastModified(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ]).flat() || [];

  return [...staticUrls, ...categoryUrls, ...postUrls, ...pageUrls];
}
