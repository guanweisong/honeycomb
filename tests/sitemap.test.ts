import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostListQuerySchema } from "@/features/post/schemas/post.list.query.schema";
import { PageListQuerySchema } from "@/features/page/schemas/page.list.query.schema";

const {
  cacheRegistrations,
  cacheStores,
  createServerClientMock,
  getServerEnvMock,
  menuIndexMock,
  pageIndexMock,
  postIndexMock,
  unstableCacheMock,
} = vi.hoisted(() => ({
  cacheRegistrations: [] as Array<{
    keyParts: string[];
    options: { revalidate?: number; tags?: string[] };
  }>,
  cacheStores: [] as Array<Map<string, Promise<unknown>>>,
  createServerClientMock: vi.fn(),
  getServerEnvMock: vi.fn(),
  menuIndexMock: vi.fn(),
  pageIndexMock: vi.fn(),
  postIndexMock: vi.fn(),
  unstableCacheMock: vi.fn(
    <T extends (...args: never[]) => Promise<unknown>>(
      loader: T,
      keyParts: string[],
      options: { revalidate?: number; tags?: string[] },
    ) => {
      const values = new Map<string, Promise<unknown>>();
      cacheStores.push(values);
      cacheRegistrations.push({ keyParts, options });

      return (...args: Parameters<T>) => {
        const key = JSON.stringify(args);
        const cached = values.get(key);
        if (cached) return cached;

        const value = loader(...args);
        values.set(key, value);
        return value;
      };
    },
  ),
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/packages/trpc/api", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("@/env/server", () => ({
  getServerEnv: getServerEnvMock,
}));

import * as sitemapIndexRoute from "../src/app/sitemap.xml/route";
import * as sitemapShardRoute from "../src/app/sitemaps/[id]/route";
import {
  getCachedSitemapShard,
  toSitemapIndexXml,
  toSitemapXml,
} from "../src/app/sitemap-data";

const client = {
  menu: { index: menuIndexMock },
  post: { index: postIndexMock },
  page: { index: pageIndexMock },
};

function list<T>(items: T[], total = items.length) {
  return { list: items, total };
}

describe("runtime sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStores.forEach((store) => store.clear());
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/path";
    delete process.env.NEXT_PHASE;
    getServerEnvMock.mockImplementation(() => ({
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    }));

    createServerClientMock.mockResolvedValue(client);
    menuIndexMock.mockResolvedValue(
      list([{ type: "CATEGORY", path: "technology" }]),
    );
    postIndexMock.mockResolvedValue(list([]));
    pageIndexMock.mockResolvedValue(list([]));
  });

  it("tags both cached sitemap datasets for immediate invalidation", () => {
    expect(cacheRegistrations).toEqual([
      {
        keyParts: ["runtime-sitemap-shard"],
        options: { revalidate: 300, tags: ["public.sitemap"] },
      },
      {
        keyParts: ["runtime-sitemap-shard-count"],
        options: { revalidate: 300, tags: ["public.sitemap"] },
      },
    ]);
  });

  it("lets production build route discovery import handlers without loading environment or database data", () => {
    process.env.NEXT_PHASE = "phase-production-build";

    expect(sitemapIndexRoute.dynamic).toBe("force-dynamic");
    expect(sitemapShardRoute.dynamic).toBe("force-dynamic");
    expect(getServerEnvMock).not.toHaveBeenCalled();
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("creates a runtime sitemap index that discovers every required shard and caches its count", async () => {
    postIndexMock.mockResolvedValue(list([], 1001));
    pageIndexMock.mockResolvedValue(list([], 3));

    const first = await sitemapIndexRoute.GET();
    const second = await sitemapIndexRoute.GET();
    const firstXml = await first.text();
    const secondXml = await second.text();

    expect(secondXml).toBe(firstXml);
    expect(firstXml).toContain("https://example.com/sitemaps/0.xml");
    expect(firstXml).toContain("https://example.com/sitemaps/1.xml");
    expect(firstXml).toContain("https://example.com/sitemaps/10.xml");
    expect(firstXml).not.toContain("https://example.com/sitemaps/11.xml");
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(postIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 1 }),
    );
    expect(pageIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 1 }),
    );
    expect(first.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
  });

  it("falls back to one safe shard when sitemap index discovery fails", async () => {
    postIndexMock.mockRejectedValue(new Error("database unavailable"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await sitemapIndexRoute.GET();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("https://example.com/sitemaps/0.xml");
    expect(xml).not.toContain("https://example.com/sitemaps/1.xml");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses cached runtime data for repeated requests to the same sitemap shard", async () => {
    postIndexMock.mockResolvedValue(
      list([{ id: "post-1", updatedAt: "2026-01-02T00:00:00.000Z" }]),
    );
    pageIndexMock.mockResolvedValue(
      list([{ id: "page-1", updatedAt: "2026-01-03T00:00:00.000Z" }]),
    );

    const first = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0.xml"),
      {
        params: Promise.resolve({ id: "0.xml" }),
      },
    );
    const second = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0.xml"),
      {
        params: Promise.resolve({ id: "0.xml" }),
      },
    );

    expect(await second.text()).toBe(await first.text());
    expect(createServerClientMock).toHaveBeenCalledTimes(2);
    expect(menuIndexMock).toHaveBeenCalledTimes(1);
    expect(postIndexMock).toHaveBeenCalledTimes(2);
    expect(pageIndexMock).toHaveBeenCalledTimes(2);
  });

  it("only emits category menu entries with non-empty paths and escapes XML URLs", async () => {
    menuIndexMock.mockResolvedValue(
      list([
        { type: "CATEGORY", path: "research&development" },
        { type: "CATEGORY", path: "" },
        { type: "CATEGORY", path: null },
        { type: "PAGE", path: "page-path" },
        { type: "CUSTOM", path: "custom-path" },
      ]),
    );

    const response = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0.xml"),
      { params: Promise.resolve({ id: "0.xml" }) },
    );
    const xml = await response.text();

    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(xml).toContain("research&amp;development");
    expect(xml).not.toContain("page-path");
    expect(xml).not.toContain("custom-path");
    expect(xml).not.toContain("category/null");
  });

  it("isolates cached sitemap content by validated site origin", async () => {
    const first = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0.xml"),
      { params: Promise.resolve({ id: "0.xml" }) },
    );
    process.env.NEXT_PUBLIC_SITE_URL = "https://second.example/path";
    const second = await sitemapShardRoute.GET(
      new Request("https://second.example/sitemaps/0.xml"),
      { params: Promise.resolve({ id: "0.xml" }) },
    );

    expect(await first.text()).toContain("https://example.com");
    expect(await second.text()).toContain("https://second.example");
    expect(menuIndexMock).toHaveBeenCalledTimes(2);
  });

  it("uses a valid current timestamp when persisted modification dates are null", async () => {
    const now = Date.parse("2026-09-05T12:00:00.000Z");
    vi.spyOn(Date, "now").mockReturnValue(now);
    postIndexMock.mockResolvedValue(
      list([{ id: "post-null-date", updatedAt: null }]),
    );
    pageIndexMock.mockResolvedValue(
      list([{ id: "page-null-date", updatedAt: null }]),
    );

    const urls = await getCachedSitemapShard("https://example.com", 0);
    const persistedUrls = urls.filter(({ url }) => url.includes("null-date"));

    expect(persistedUrls).toHaveLength(4);
    for (const entry of persistedUrls) {
      expect(entry.lastModified?.getTime()).toBe(now);
    }
  });

  it("rejects a shard beyond the discovered range before requesting its high offset", async () => {
    postIndexMock.mockResolvedValue(list([], 101));
    pageIndexMock.mockResolvedValue(list([], 0));

    const response = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/2.xml"),
      { params: Promise.resolve({ id: "2.xml" }) },
    );

    expect(response.status).toBe(404);
    expect(postIndexMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 100 }),
    );
    expect(pageIndexMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 100 }),
    );
  });

  it("returns only safe static URLs and reports the failure when dynamic data is unavailable", async () => {
    const error = new Error("Turso unavailable");
    postIndexMock.mockRejectedValue(error);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const sitemap = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0.xml"),
      {
        params: Promise.resolve({ id: "0.xml" }),
      },
    );

    const xml = await sitemap.text();
    expect(xml).toContain("https://example.com/zh/list/category");
    expect(xml).toContain("https://example.com/en/list/category");
    expect(xml).not.toContain("technology");
    expect(sitemap.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toEqual(
      expect.objectContaining({
        level: "error",
        event: "server.error",
        operation: "sitemap.generate",
        outcome: "error",
        error: expect.objectContaining({ message: "Turso unavailable" }),
      }),
    );
  });

  it("reads the second bounded batch so URLs after the first 100 records remain discoverable", async () => {
    postIndexMock.mockImplementation(({ page }) =>
      Promise.resolve(
        page === 2
          ? list(
              [{ id: "post-101", updatedAt: "2026-01-02T00:00:00.000Z" }],
              101,
            )
          : list([], 101),
      ),
    );
    pageIndexMock.mockImplementation(({ page }) =>
      Promise.resolve(
        page === 2
          ? list(
              [{ id: "page-101", updatedAt: "2026-01-03T00:00:00.000Z" }],
              101,
            )
          : list([], 101),
      ),
    );

    const sitemap = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/1.xml"),
      {
        params: Promise.resolve({ id: "1.xml" }),
      },
    );

    expect(postIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 100 }),
    );
    expect(pageIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 100 }),
    );
    const xml = await sitemap.text();
    expect(xml).toContain("https://example.com/zh/archives/post-101");
    expect(xml).toContain("https://example.com/en/archives/post-101");
    expect(xml).toContain("https://example.com/zh/pages/page-101");
    expect(xml).toContain("https://example.com/en/pages/page-101");
  });

  it("enumerates every dynamic URL through the real bounded list schemas", async () => {
    const posts = Array.from({ length: 205 }, (_, index) => ({
      id: `post-${index + 1}`,
      updatedAt: null,
    }));
    const pages = Array.from({ length: 101 }, (_, index) => ({
      id: `page-${index + 1}`,
      updatedAt: null,
    }));
    postIndexMock.mockImplementation(async (input: unknown) => {
      const { page = 1, limit = 10 } = PostListQuerySchema.parse(input);
      return list(posts.slice((page - 1) * limit, page * limit), posts.length);
    });
    pageIndexMock.mockImplementation(async (input: unknown) => {
      const { page = 1, limit = 10 } = PageListQuerySchema.parse(input);
      return list(pages.slice((page - 1) * limit, page * limit), pages.length);
    });
    menuIndexMock.mockResolvedValue(
      list([{ type: "CATEGORY", path: "root/child/grandchild" }]),
    );

    const firstResponse = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0.xml"),
      {
        params: Promise.resolve({ id: "0.xml" }),
      },
    );
    const firstXml = await firstResponse.text();
    expect(firstXml).toContain("https://example.com/zh/archives/post-1");
    expect(firstXml).toContain("https://example.com/en/pages/page-1");

    const indexXml = await (await sitemapIndexRoute.GET()).text();
    const shardUrls = [...indexXml.matchAll(/<loc>(.*?)<\/loc>/g)].flatMap(
      ([, url]) => (url ? [url] : []),
    );
    expect(shardUrls).toEqual([
      "https://example.com/sitemaps/0.xml",
      "https://example.com/sitemaps/1.xml",
      "https://example.com/sitemaps/2.xml",
    ]);
    const urls: string[] = [];
    for (const shardUrl of shardUrls) {
      const response = await sitemapShardRoute.GET(new Request(shardUrl), {
        params: Promise.resolve({
          id: new URL(shardUrl).pathname.split("/").at(-1) ?? "",
        }),
      });
      expect(response.status).toBe(200);
      urls.push(
        ...[...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].flatMap(
          ([, url]) => (url ? [url] : []),
        ),
      );
    }
    expect(new Set(urls).size).toBe(617);
    expect(urls.filter((url) => url.includes("/archives/"))).toHaveLength(410);
    expect(urls.filter((url) => url.includes("/pages/"))).toHaveLength(202);
    for (const locale of ["zh", "en"]) {
      for (const post of posts)
        expect(urls).toContain(
          `https://example.com/${locale}/archives/${post.id}`,
        );
      for (const page of pages)
        expect(urls).toContain(
          `https://example.com/${locale}/pages/${page.id}`,
        );
      expect(urls).toContain(
        `https://example.com/${locale}/list/category/root/child/grandchild`,
      );
    }
  });

  it.each(["invalid", "-1"])(
    "rejects the malformed shard id %s",
    async (id) => {
      const response = await sitemapShardRoute.GET(
        new Request(`https://example.com/sitemaps/${id}`),
        { params: Promise.resolve({ id }) },
      );

      expect(response.status).toBe(404);
      expect(createServerClientMock).not.toHaveBeenCalled();
    },
  );

  it("accepts a numeric shard id without an XML suffix", async () => {
    const response = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0"),
      { params: Promise.resolve({ id: "0" }) },
    );

    expect(response.status).toBe(200);
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
