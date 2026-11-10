import { MenuType } from "@/features/menu/types/menu.type";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (loader: unknown) => loader,
}));

vi.mock("@/lib/db/db", () => ({ getDb: () => ({}) }));
vi.mock("@/features/post/server/post-queries", () => ({
  listPublishedPostSitemapEntries: async () => [],
}));
vi.mock("@/features/page/server/page-queries", () => ({
  listPublishedPageSitemapEntries: async () => [],
}));
vi.mock("@/features/menu/server/menu-queries", () => ({
  listMenus: async () => ({
    list: [
      { type: MenuType.CATEGORY, id: "legacy", path: "a/b" },
      {
        type: MenuType.CATEGORY,
        id: "notes",
        path: "笔记",
        parent: "legacy",
      },
    ],
    total: 2,
  }),
}));

import {
  getCachedSitemapShard,
  toSitemapIndexXml,
  toSitemapXml,
} from "@/app/(blog)/lib/server/sitemap-data";

describe("runtime sitemap", () => {
  it("uses the canonical localized paths for legacy and Unicode categories", async () => {
    const entries = await getCachedSitemapShard("https://example.com", 0);
    const categoryUrls = entries.map(({ url }) => url);
    expect(categoryUrls).toEqual(
      expect.arrayContaining([
        "https://example.com/zh/list/category/~legacy",
        "https://example.com/en/list/category/~legacy/%E7%AC%94%E8%AE%B0",
      ]),
    );
    expect(categoryUrls.some((url) => url.includes("/a/b"))).toBe(false);
  });

  it("escapes every XML entity and omits an absent modification date", () => {
    const sitemap = toSitemapXml([
      {
        url: "https://example.com/<tag>?a=1&b='quoted'\"",
        changeFrequency: "daily",
        priority: 0.5,
      },
    ]);
    const index = toSitemapIndexXml(
      "https://example.com/<root>?a=1&b='x'\"",
      1,
    );

    expect(sitemap).toContain(
      "https://example.com/&lt;tag&gt;?a=1&amp;b=&apos;quoted&apos;&quot;",
    );
    expect(sitemap).not.toContain("<lastmod>");
    expect(index).toContain(
      "https://example.com/&lt;root&gt;?a=1&amp;b=&apos;x&apos;&quot;/sitemaps/0.xml",
    );
  });
});
