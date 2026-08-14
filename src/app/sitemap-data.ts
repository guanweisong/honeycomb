import { unstable_cache } from "next/cache";

import { getServerEnv } from "@/env/server";
import { MenuType } from "@/packages/domain/navigation/menu";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import { getLogger } from "@/packages/infrastructure/observability/server";

export const SITEMAP_BATCH_SIZE = 1000;
export const SITEMAP_CACHE_REVALIDATE_SECONDS = 300;

type SitemapUrl = {
  url: string;
  lastModified?: Date;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
};

export function getSiteOrigin() {
  return new URL(getServerEnv().NEXT_PUBLIC_SITE_URL).origin;
}

export function getStaticSitemapUrls(baseUrl: string): SitemapUrl[] {
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/zh/list/category`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/list/category`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}

export const getCachedSitemapShard = unstable_cache(
  async (baseUrl: string, shard: number) => {
    // 延迟加载 tRPC，避免 sitemap -> tRPC context -> auth -> database hooks
    // 与认证 Route Handler 之间在生产构建阶段形成循环模块初始化。
    const { createServerClient } = await import("@/packages/trpc/api");
    const serverClient = await createServerClient();
    const page = shard + 1;
    const [menu, posts, pages] = await Promise.all([
      shard === 0 ? serverClient.menu.index() : Promise.resolve(null),
      serverClient.post.index({ page, limit: SITEMAP_BATCH_SIZE }),
      serverClient.page.index({ page, limit: SITEMAP_BATCH_SIZE }),
    ]);
    const categoryMenus =
      menu?.list.flatMap((item) => {
        const path = item.path?.trim();
        return item.type === MenuType.CATEGORY && path
          ? [{ ...item, path }]
          : [];
      }) ?? [];
    const dynamicUrls: SitemapUrl[] = [
      ...categoryMenus.flatMap((item) => [
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
      ]),
      ...posts.list.flatMap((post) => [
        {
          url: `${baseUrl}/zh/archives/${post.id}`,
          lastModified: new Date(post.updatedAt ?? Date.now()),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
        {
          url: `${baseUrl}/en/archives/${post.id}`,
          lastModified: new Date(post.updatedAt ?? Date.now()),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ]),
      ...pages.list.flatMap((pageItem) => [
        {
          url: `${baseUrl}/zh/pages/${pageItem.id}`,
          lastModified: new Date(pageItem.updatedAt ?? Date.now()),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        },
        {
          url: `${baseUrl}/en/pages/${pageItem.id}`,
          lastModified: new Date(pageItem.updatedAt ?? Date.now()),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        },
      ]),
    ];

    return shard === 0
      ? [...getStaticSitemapUrls(baseUrl), ...dynamicUrls]
      : dynamicUrls;
  },
  ["runtime-sitemap-shard"],
  { revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS },
);

export const getCachedSitemapShardCount = unstable_cache(
  async (baseUrl: string) => {
    void baseUrl;
    const { createServerClient } = await import("@/packages/trpc/api");
    const serverClient = await createServerClient();
    const [posts, pages] = await Promise.all([
      serverClient.post.index({ page: 1, limit: 1 }),
      serverClient.page.index({ page: 1, limit: 1 }),
    ]);

    return Math.max(
      1,
      Math.ceil(Math.max(posts.total, pages.total) / SITEMAP_BATCH_SIZE),
    );
  },
  ["runtime-sitemap-shard-count"],
  { revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS },
);

export function reportSitemapError(error: unknown) {
  getLogger().error(LogEvent.serverError, {
    operation: "sitemap.generate",
    outcome: "error",
    error,
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

export function toSitemapXml(urls: SitemapUrl[]) {
  const entries = urls
    .map(
      ({ url, lastModified, changeFrequency, priority }) =>
        `\n  <url>\n    <loc>${escapeXml(url)}</loc>${
          lastModified
            ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>`
            : ""
        }\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}\n</urlset>`;
}

export function toSitemapIndexXml(baseUrl: string, shardCount: number) {
  const entries = Array.from(
    { length: shardCount },
    (_, shard) =>
      `\n  <sitemap>\n    <loc>${escapeXml(`${baseUrl}/sitemaps/${shard}.xml`)}</loc>\n  </sitemap>`,
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}\n</sitemapindex>`;
}
