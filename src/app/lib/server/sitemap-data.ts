import "server-only";

import {
  getCategoryHref,
  getCategoryRouteSegments,
} from "@/app/(blog)/lib/category-route";
import { unstable_cache } from "next/cache";

import { getServerEnv } from "@/env/server";
import { supportedLanguages } from "@/lib/i18n/i18n";
import { MAX_PAGE_SIZE } from "@/lib/validation/resource-limits";
import { MenuType } from "@/features/menu/types/menu.type";
import { LogEvent } from "@/lib/observability/core/names";
import { getLogger } from "@/lib/observability/server";
import { SITEMAP_CACHE_TAG } from "@/lib/cache/public-cache-keys";

const SITEMAP_BATCH_SIZE = MAX_PAGE_SIZE;
const SITEMAP_CACHE_REVALIDATE_SECONDS = 300;

type SitemapUrl = {
  url: string;
  lastModified?: Date;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
};

export function getSiteOrigin() {
  return new URL(getServerEnv().NEXT_PUBLIC_SITE_URL).origin;
}

function localizeSitemapUrl(
  baseUrl: string,
  href: string,
  attributes: Omit<SitemapUrl, "url">,
): SitemapUrl[] {
  return supportedLanguages.map((locale) => ({
    url: `${baseUrl}/${locale}${href}`,
    ...attributes,
  }));
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
    ...localizeSitemapUrl(baseUrl, "/list/category", {
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    }),
  ];
}

export const getCachedSitemapShard = unstable_cache(
  async (baseUrl: string, shard: number) => {
    // Keep data/auth initialization lazy: route discovery must remain database-free.
    const [
      { getDb },
      { listPublishedPostSitemapEntries },
      { listPublishedPageSitemapEntries },
    ] = await Promise.all([
      import("@/lib/db/db"),
      import("@/features/post/server/post-queries"),
      import("@/features/page/server/page-queries"),
    ]);
    const db = getDb();
    const page = shard + 1;
    const [menu, posts, pages] = await Promise.all([
      shard === 0
        ? import("@/app/trpc/server").then(async ({ createServerClient }) =>
            (await createServerClient()).menu.index(),
          )
        : Promise.resolve(null),
      listPublishedPostSitemapEntries(db, page, SITEMAP_BATCH_SIZE),
      listPublishedPageSitemapEntries(db, page, SITEMAP_BATCH_SIZE),
    ]);
    const categoryHrefs =
      menu?.list
        .filter((item) => item.type === MenuType.CATEGORY && item.path != null)
        .map((item) =>
          getCategoryHref(
            getCategoryRouteSegments({ id: item.id, menu: menu.list }),
          ),
        ) ?? [];
    const dynamicUrls: SitemapUrl[] = [
      ...categoryHrefs.flatMap((href) =>
        localizeSitemapUrl(baseUrl, href, {
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        }),
      ),
      ...posts.flatMap(({ id, updatedAt }) =>
        localizeSitemapUrl(baseUrl, `/archives/${id}`, {
          lastModified: new Date(updatedAt ?? Date.now()),
          changeFrequency: "weekly",
          priority: 0.7,
        }),
      ),
      ...pages.flatMap(({ id, updatedAt }) =>
        localizeSitemapUrl(baseUrl, `/pages/${id}`, {
          lastModified: new Date(updatedAt ?? Date.now()),
          changeFrequency: "monthly",
          priority: 0.6,
        }),
      ),
    ];

    return shard === 0
      ? [...getStaticSitemapUrls(baseUrl), ...dynamicUrls]
      : dynamicUrls;
  },
  ["runtime-sitemap-shard"],
  {
    revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS,
    tags: [SITEMAP_CACHE_TAG],
  },
);

export const getCachedSitemapShardCount = unstable_cache(
  async (baseUrl: string) => {
    void baseUrl;
    const [{ getDb }, { countPublishedPosts }, { countPublishedPages }] =
      await Promise.all([
        import("@/lib/db/db"),
        import("@/features/post/server/post-queries"),
        import("@/features/page/server/page-queries"),
      ]);
    const db = getDb();
    const [posts, pages] = await Promise.all([
      countPublishedPosts(db),
      countPublishedPages(db),
    ]);

    return Math.max(1, Math.ceil(Math.max(posts, pages) / SITEMAP_BATCH_SIZE));
  },
  ["runtime-sitemap-shard-count"],
  {
    revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS,
    tags: [SITEMAP_CACHE_TAG],
  },
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

    return entities[character] ?? character;
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
