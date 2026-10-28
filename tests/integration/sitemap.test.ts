import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";

const {
  cacheRegistrations,
  cacheStores,
  createServerClientMock,
  getServerEnvMock,
  menuIndexMock,
  pageEntriesMock,
  pageCountMock,
  postCountMock,
  getDbMock,
  postEntriesMock,
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
  pageEntriesMock: vi.fn(),
  pageCountMock: vi.fn(),
  postCountMock: vi.fn(),
  getDbMock: vi.fn(),
  postEntriesMock: vi.fn(),
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

vi.mock("@/app/_trpc/server", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("@/env/server", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@/lib/db/db", () => ({ getDb: getDbMock }));
vi.mock("@/features/post/server/post-queries", () => ({
  listPublishedPostSitemapEntries: postEntriesMock,
  countPublishedPosts: postCountMock,
}));
vi.mock("@/features/page/server/page-queries", () => ({
  listPublishedPageSitemapEntries: pageEntriesMock,
  countPublishedPages: pageCountMock,
}));

import * as sitemapIndexRoute from "@/app/sitemap.xml/route";
import * as sitemapShardRoute from "@/app/sitemaps/[id]/route";
import { getCachedSitemapShard } from "@/app/lib/server/sitemap-data";

const client = {
  menu: { index: menuIndexMock },
};

function list<T>(items: T[], total = items.length) {
  return { list: items, total };
}

describe("runtime sitemap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStores.forEach((store) => store.clear());
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/path");
    vi.stubEnv("NEXT_PHASE", undefined);
    getServerEnvMock.mockImplementation(() => ({
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    }));

    createServerClientMock.mockResolvedValue(client);
    getDbMock.mockReturnValue({});
    postCountMock.mockResolvedValue(0);
    pageCountMock.mockResolvedValue(0);
    menuIndexMock.mockResolvedValue(
      list([
        {
          id: "category",
          parent: null,
          title: {},
          type: "CATEGORY",
          path: "technology",
        },
      ]),
    );
    postEntriesMock.mockResolvedValue([]);
    pageEntriesMock.mockResolvedValue([]);
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

  it("lets production build route discovery import handlers without reading environment or requesting database data", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PHASE", "phase-production-build");

    const index = await import("@/app/sitemap.xml/route");
    const shard = await import("@/app/sitemaps/[id]/route");
    expect(index).not.toHaveProperty("dynamic");
    expect(shard).not.toHaveProperty("dynamic");
    expect(getServerEnvMock).not.toHaveBeenCalled();
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("creates a runtime sitemap index that discovers every required shard and caches its count", async () => {
    postCountMock.mockResolvedValue(1001);
    pageCountMock.mockResolvedValue(3);

    const first = await sitemapIndexRoute.GET();
    const second = await sitemapIndexRoute.GET();
    const firstXml = await first.text();
    const secondXml = await second.text();

    expect(secondXml).toBe(firstXml);
    expect(firstXml).toContain("https://example.com/sitemaps/0.xml");
    expect(firstXml).toContain("https://example.com/sitemaps/1.xml");
    expect(firstXml).toContain("https://example.com/sitemaps/10.xml");
    expect(firstXml).not.toContain("https://example.com/sitemaps/11.xml");
    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(postCountMock).toHaveBeenCalledOnce();
    expect(pageCountMock).toHaveBeenCalledOnce();
    expect(postEntriesMock).not.toHaveBeenCalled();
    expect(pageEntriesMock).not.toHaveBeenCalled();
    expect(first.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
  });

  it("falls back to one safe shard when sitemap index discovery fails", async () => {
    postCountMock.mockRejectedValue(new Error("database unavailable"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await sitemapIndexRoute.GET();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("https://example.com/sitemaps/0.xml");
    expect(xml).not.toContain("https://example.com/sitemaps/1.xml");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses cached runtime data for repeated requests to the same sitemap shard", async () => {
    postEntriesMock.mockResolvedValue([
      { id: "post-1", updatedAt: "2026-01-02T00:00:00.000Z" },
    ]);
    pageEntriesMock.mockResolvedValue([
      { id: "page-1", updatedAt: "2026-01-03T00:00:00.000Z" },
    ]);

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
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(menuIndexMock).toHaveBeenCalledTimes(1);
    expect(postEntriesMock).toHaveBeenCalledTimes(1);
    expect(pageEntriesMock).toHaveBeenCalledTimes(1);
  });

  it("only emits category menu entries with non-empty paths and escapes XML URLs", async () => {
    menuIndexMock.mockResolvedValue(
      list([
        {
          id: "category",
          parent: null,
          title: {},
          type: "CATEGORY",
          path: "research&development",
        },
        { id: "empty", parent: null, title: {}, type: "CATEGORY", path: "" },
        { id: "null", parent: null, title: {}, type: "CATEGORY", path: null },
        {
          id: "page",
          parent: null,
          title: {},
          type: "PAGE",
          path: "page-path",
        },
        {
          id: "custom",
          parent: null,
          title: {},
          type: "CUSTOM",
          path: "custom-path",
        },
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
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://second.example/path");
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
    postEntriesMock.mockResolvedValue([
      { id: "post-null-date", updatedAt: null },
    ]);
    pageEntriesMock.mockResolvedValue([
      { id: "page-null-date", updatedAt: null },
    ]);

    const urls = await getCachedSitemapShard("https://example.com", 0);
    const persistedUrls = urls.filter(({ url }) => url.includes("null-date"));

    expect(persistedUrls).toHaveLength(4);
    for (const entry of persistedUrls) {
      expect(entry.lastModified?.getTime()).toBe(now);
    }
  });

  it("rejects a shard beyond the discovered range before requesting its high offset", async () => {
    postCountMock.mockResolvedValue(101);
    pageCountMock.mockResolvedValue(0);

    const response = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/2.xml"),
      { params: Promise.resolve({ id: "2.xml" }) },
    );

    expect(response.status).toBe(404);
    expect(postEntriesMock).not.toHaveBeenCalledWith(expect.anything(), 3, 100);
    expect(pageEntriesMock).not.toHaveBeenCalledWith(expect.anything(), 3, 100);
  });

  it("returns only safe static URLs and reports the failure when dynamic data is unavailable", async () => {
    const error = new Error("Turso unavailable");
    postEntriesMock.mockRejectedValue(error);
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
    postCountMock.mockResolvedValue(101);
    pageCountMock.mockResolvedValue(101);
    postEntriesMock.mockImplementation((_db, page) =>
      Promise.resolve(
        page === 2
          ? [{ id: "post-101", updatedAt: "2026-01-02T00:00:00.000Z" }]
          : [],
      ),
    );
    pageEntriesMock.mockImplementation((_db, page) =>
      Promise.resolve(
        page === 2
          ? [{ id: "page-101", updatedAt: "2026-01-03T00:00:00.000Z" }]
          : [],
      ),
    );

    const sitemap = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/1.xml"),
      {
        params: Promise.resolve({ id: "1.xml" }),
      },
    );

    expect(postEntriesMock).toHaveBeenCalledWith(expect.anything(), 2, 100);
    expect(pageEntriesMock).toHaveBeenCalledWith(expect.anything(), 2, 100);
    const xml = await sitemap.text();
    expect(xml).toContain("https://example.com/zh/archives/post-101");
    expect(xml).toContain("https://example.com/en/archives/post-101");
    expect(xml).toContain("https://example.com/zh/pages/page-101");
    expect(xml).toContain("https://example.com/en/pages/page-101");
  });

  it("uses the same parent-chain category paths as blog navigation", async () => {
    menuIndexMock.mockResolvedValue(
      list([
        { id: "root", type: "CATEGORY", path: "root", parent: null, title: {} },
        {
          id: "child",
          type: "CATEGORY",
          path: "child",
          parent: "root",
          title: {},
        },
        {
          id: "leaf",
          type: "CATEGORY",
          path: "leaf",
          parent: "child",
          title: {},
        },
      ]),
    );
    const response = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/0.xml"),
      { params: Promise.resolve({ id: "0.xml" }) },
    );
    const xml = await response.text();
    for (const locale of ["zh", "en"]) {
      expect(xml).toContain(
        `https://example.com/${locale}/list/category/root/child/leaf`,
      );
      expect(xml).not.toContain(
        `https://example.com/${locale}/list/category/leaf<`,
      );
    }
  });

  it("enumerates every dynamic URL through bounded internal reads", async () => {
    postCountMock.mockResolvedValue(205);
    pageCountMock.mockResolvedValue(101);
    const posts = Array.from({ length: 205 }, (_, index) => ({
      id: `post-${index + 1}`,
      updatedAt: null,
    }));
    const pages = Array.from({ length: 101 }, (_, index) => ({
      id: `page-${index + 1}`,
      updatedAt: null,
    }));
    postEntriesMock.mockImplementation(
      async (_db: unknown, page: number, limit: number) => {
        PaginationQuerySchema.parse({ page, limit });
        return posts.slice((page - 1) * limit, page * limit);
      },
    );
    pageEntriesMock.mockImplementation(
      async (_db: unknown, page: number, limit: number) => {
        PaginationQuerySchema.parse({ page, limit });
        return pages.slice((page - 1) * limit, page * limit);
      },
    );
    menuIndexMock.mockResolvedValue(
      list([
        {
          id: "category",
          parent: null,
          title: {},
          type: "CATEGORY",
          path: "root/child/grandchild",
        },
      ]),
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
});
