import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cacheStores,
  createServerClientMock,
  getServerEnvMock,
  menuIndexMock,
  pageIndexMock,
  postIndexMock,
  unstableCacheMock,
} = vi.hoisted(() => ({
  cacheStores: [] as Array<Map<string, Promise<unknown>>>,
  createServerClientMock: vi.fn(),
  getServerEnvMock: vi.fn(),
  menuIndexMock: vi.fn(),
  pageIndexMock: vi.fn(),
  postIndexMock: vi.fn(),
  unstableCacheMock: vi.fn(
    <T extends (...args: never[]) => Promise<unknown>>(loader: T) => {
      const values = new Map<string, Promise<unknown>>();
      cacheStores.push(values);

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

  it("rejects a shard beyond the discovered range before requesting its high offset", async () => {
    postIndexMock.mockResolvedValue(list([], 1001));
    pageIndexMock.mockResolvedValue(list([], 0));

    const response = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/2.xml"),
      { params: Promise.resolve({ id: "2.xml" }) },
    );

    expect(response.status).toBe(404);
    expect(postIndexMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 1000 }),
    );
    expect(pageIndexMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 1000 }),
    );
  });

  it("returns only safe static URLs and reports the failure when dynamic data is unavailable", async () => {
    const error = new Error("Turso unavailable");
    postIndexMock.mockRejectedValue(error);
    const logSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

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

  it("reads the second batch for a later shard so URLs after the first 1000 records remain discoverable", async () => {
    postIndexMock.mockImplementation(({ page }) =>
      Promise.resolve(
        page === 2
          ? list(
              [{ id: "post-1001", updatedAt: "2026-01-02T00:00:00.000Z" }],
              1001,
            )
          : list([], 1001),
      ),
    );
    pageIndexMock.mockImplementation(({ page }) =>
      Promise.resolve(
        page === 2
          ? list(
              [{ id: "page-1001", updatedAt: "2026-01-03T00:00:00.000Z" }],
              1001,
            )
          : list([], 1001),
      ),
    );

    const sitemap = await sitemapShardRoute.GET(
      new Request("https://example.com/sitemaps/1.xml"),
      {
        params: Promise.resolve({ id: "1.xml" }),
      },
    );

    expect(postIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 1000 }),
    );
    expect(pageIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 1000 }),
    );
    const xml = await sitemap.text();
    expect(xml).toContain("https://example.com/zh/archives/post-1001");
    expect(xml).toContain("https://example.com/en/archives/post-1001");
    expect(xml).toContain("https://example.com/zh/pages/page-1001");
    expect(xml).toContain("https://example.com/en/pages/page-1001");
  });
});
