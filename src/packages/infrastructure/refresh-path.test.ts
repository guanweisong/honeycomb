import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();
const mockBumpCacheVersion = vi.fn().mockResolvedValue(1);
const mockLoggerError = vi.fn();
const mockMetricIncrement = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));
vi.mock("@/packages/infrastructure/cache/upstash-cache", () => ({
  bumpCacheVersion: (...args: unknown[]) => mockBumpCacheVersion(...args),
}));
vi.mock("@/packages/infrastructure/observability/server", () => ({
  getLogger: () => ({ error: mockLoggerError }),
  getMetrics: () => ({ increment: mockMetricIncrement }),
}));

import { publicContentInvalidator } from "./refresh-path";

const SITEMAP_CACHE_TAG = "public.sitemap";

describe("publicContentInvalidator", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
    mockRevalidateTag.mockReset();
    mockBumpCacheVersion.mockReset().mockResolvedValue(1);
    mockLoggerError.mockReset();
    mockMetricIncrement.mockReset();
  });

  it("deduplicates details and invalidates each requested cache layer once", async () => {
    await publicContentInvalidator.invalidate({
      contents: [
        { id: "507f1f77bcf86cd799439011", type: "post" },
        { id: "507f1f77bcf86cd799439011", type: "post" },
        { id: "507f1f77bcf86cd799439012", type: "page" },
      ],
      refreshLayout: true,
      refreshPostIndex: true,
      refreshSitemap: true,
    });

    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/zh/archives/507f1f77bcf86cd799439011"],
      ["/en/archives/507f1f77bcf86cd799439011"],
      ["/zh/pages/507f1f77bcf86cd799439012"],
      ["/en/pages/507f1f77bcf86cd799439012"],
      ["/[locale]", "layout"],
    ]);
    expect(mockBumpCacheVersion).toHaveBeenCalledOnce();
    expect(mockBumpCacheVersion).toHaveBeenCalledWith(
      "post.index",
      "cache:post:index:version",
    );
    expect(mockRevalidateTag.mock.calls).toEqual([
      ["public.post-index", { expire: 0 }],
      [SITEMAP_CACHE_TAG, { expire: 0 }],
      ["public.post.507f1f77bcf86cd799439011", { expire: 0 }],
      ["public.page.507f1f77bcf86cd799439012", { expire: 0 }],
      ["public.layout", { expire: 0 }],
    ]);
  });

  it("does not execute omitted cache scopes", async () => {
    await publicContentInvalidator.invalidate({ refreshLayout: true });

    expect(mockRevalidatePath.mock.calls).toEqual([["/[locale]", "layout"]]);
    expect(mockBumpCacheVersion).not.toHaveBeenCalled();
    expect(mockRevalidateTag).toHaveBeenCalledWith("public.layout", {
      expire: 0,
    });
  });

  it("rejects arbitrary paths and invalid identifiers before side effects", async () => {
    await expect(
      publicContentInvalidator.invalidate({ contents: ["/admin"] } as never),
    ).rejects.toThrow();
    await expect(
      publicContentInvalidator.invalidate({
        contents: [{ id: "short", type: "page" }],
      }),
    ).rejects.toThrow();

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockBumpCacheVersion).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("retries the complete plan once and reports completed after recovery", async () => {
    mockBumpCacheVersion
      .mockRejectedValueOnce(new Error("temporary cache failure"))
      .mockResolvedValueOnce(2);

    await expect(
      publicContentInvalidator.invalidate({ refreshPostIndex: true }),
    ).resolves.toEqual({ state: "completed" });
    expect(mockBumpCacheVersion).toHaveBeenCalledTimes(2);
    expect(mockMetricIncrement).toHaveBeenCalledWith(
      "public-cache.invalidations.total",
      { operation: "invalidate", outcome: "completed" },
    );
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it("returns degraded and emits only low-cardinality telemetry after two failures", async () => {
    mockBumpCacheVersion.mockRejectedValue(new Error("secret-key-value"));

    await expect(
      publicContentInvalidator.invalidate({ refreshPostIndex: true }),
    ).resolves.toEqual({ state: "degraded" });

    expect(mockBumpCacheVersion).toHaveBeenCalledTimes(2);
    expect(mockLoggerError).toHaveBeenCalledWith(
      "cache.invalidation.degraded",
      { operation: "invalidate", outcome: "degraded" },
    );
    expect(mockMetricIncrement).toHaveBeenCalledWith(
      "public-cache.invalidations.total",
      { operation: "invalidate", outcome: "degraded" },
    );
    expect(JSON.stringify(mockLoggerError.mock.calls)).not.toContain(
      "secret-key-value",
    );
  });

  it("continues all other targets when Redis version invalidation fails", async () => {
    mockBumpCacheVersion.mockRejectedValue(new Error("Redis unavailable"));

    await expect(publicContentInvalidator.invalidate({
      refreshPostIndex: true,
      refreshSitemap: true,
      contents: [{ id: "507f1f77bcf86cd799439011", type: "post" }],
      refreshLayout: true,
    })).resolves.toEqual({ state: "degraded" });

    expect(mockRevalidateTag.mock.calls).toEqual([
      ["public.post-index", { expire: 0 }],
      [SITEMAP_CACHE_TAG, { expire: 0 }],
      ["public.post.507f1f77bcf86cd799439011", { expire: 0 }],
      ["public.layout", { expire: 0 }],
      ["public.post-index", { expire: 0 }],
      [SITEMAP_CACHE_TAG, { expire: 0 }],
      ["public.post.507f1f77bcf86cd799439011", { expire: 0 }],
      ["public.layout", { expire: 0 }],
    ]);
    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/zh/archives/507f1f77bcf86cd799439011"],
      ["/en/archives/507f1f77bcf86cd799439011"],
      ["/[locale]", "layout"],
      ["/zh/archives/507f1f77bcf86cd799439011"],
      ["/en/archives/507f1f77bcf86cd799439011"],
      ["/[locale]", "layout"],
    ]);
  });

  it("continues independent tags and routes after Next cache targets fail", async () => {
    mockRevalidateTag.mockImplementation((tag: string) => {
      if (tag === "public.post.507f1f77bcf86cd799439011") {
        throw new Error("detail tag unavailable");
      }
    });
    mockRevalidatePath.mockImplementation((path: string) => {
      if (path.startsWith("/zh/archives/")) throw new Error("route unavailable");
    });

    await expect(publicContentInvalidator.invalidate({
      contents: [
        { id: "507f1f77bcf86cd799439011", type: "post" },
        { id: "507f1f77bcf86cd799439012", type: "page" },
      ],
      refreshLayout: true,
    })).resolves.toEqual({ state: "degraded" });

    expect(mockRevalidateTag).toHaveBeenCalledTimes(6);
    expect(mockRevalidateTag).toHaveBeenCalledWith("public.page.507f1f77bcf86cd799439012", { expire: 0 });
    expect(mockRevalidateTag).toHaveBeenCalledWith("public.layout", { expire: 0 });
    expect(mockRevalidatePath).toHaveBeenCalledTimes(10);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/en/archives/507f1f77bcf86cd799439011");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/zh/pages/507f1f77bcf86cd799439012");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]", "layout");
  });

  it("invalidates inner data caches before route caches can regenerate", async () => {
    const order: string[] = [];
    mockBumpCacheVersion.mockImplementationOnce(async () => {
      order.push("post-index");
      return 2;
    });
    mockRevalidateTag.mockImplementationOnce(() => {
      order.push("sitemap");
    });
    mockRevalidatePath.mockImplementation(() => {
      order.push("route");
    });

    await publicContentInvalidator.invalidate({
      contents: [{ id: "507f1f77bcf86cd799439011", type: "post" }],
      refreshLayout: true,
      refreshPostIndex: true,
      refreshSitemap: true,
    });

    expect(order).toEqual([
      "post-index",
      "sitemap",
      "route",
      "route",
      "route",
    ]);
  });
});
