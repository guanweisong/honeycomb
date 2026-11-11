import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  createServerClient: vi.fn(),
  menuIndex: vi.fn(),
  postIndex: vi.fn(),
  settingIndex: vi.fn(),
  tagIndex: vi.fn(),
  userDetail: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: mocks.cacheLife,
  cacheTag: mocks.cacheTag,
}));
vi.mock("@/app/trpc/server", () => ({
  createServerClient: mocks.createServerClient,
}));

import {
  createListHydrationState,
  getCachedListPageData,
} from "@/app/(blog)/[locale]/list/[...slug]/page.data";

describe("cached blog list page data", () => {
  beforeEach(() => {
    mocks.cacheLife.mockReset();
    mocks.cacheTag.mockReset();
    mocks.createServerClient.mockReset().mockResolvedValue({
      menu: { index: mocks.menuIndex },
      post: { index: mocks.postIndex },
      setting: { index: mocks.settingIndex },
      tag: { index: mocks.tagIndex },
      user: { detail: mocks.userDetail },
    });
    mocks.menuIndex.mockReset().mockResolvedValue({ list: [] });
    mocks.postIndex.mockReset().mockResolvedValue({
      list: [{ id: "post-1", title: { en: "Cached title" } }],
      total: 1,
    });
    mocks.settingIndex.mockReset().mockResolvedValue({
      siteName: { en: "Honeycomb" },
      siteSubName: { en: "A blog" },
    });
    mocks.tagIndex.mockReset().mockResolvedValue({ list: [] });
    mocks.userDetail.mockReset().mockResolvedValue(null);
  });

  it("caches URL-dependent list data without request-scoped observability IDs", async () => {
    const result = await getCachedListPageData("en", ["category"]);

    expect(mocks.cacheLife).toHaveBeenCalledOnce();
    expect(mocks.cacheLife).toHaveBeenCalledWith("hours");
    expect(mocks.cacheTag).toHaveBeenCalledOnce();
    expect(mocks.createServerClient).toHaveBeenCalledWith({
      requestContext: { requestId: "public-list-cache-fill" },
      skipRequestObservability: true,
    });
    expect(mocks.postIndex).toHaveBeenCalledWith({
      status: ["PUBLISHED"],
      limit: 10,
      sortField: "createdAt",
      cursor: null,
    });
    expect(result).toMatchObject({
      kind: "content",
      siteName: "Honeycomb",
      siteSubName: "A blog",
      listHasContent: true,
      listResult: { list: [{ id: "post-1" }], total: 1 },
    });
    expect(JSON.stringify(result)).not.toContain("requestId");
  });

  it("creates fresh hydration timestamps outside the cached list data", async () => {
    const cached = await getCachedListPageData("en", ["category"]);
    if (cached.kind !== "content") throw new Error("Expected list content");
    const startedAt = Date.now();
    const state = createListHydrationState(cached.queryParams, cached.listResult);
    const dataUpdatedAt = state.queries[0]?.state.dataUpdatedAt;

    expect(dataUpdatedAt).toBeGreaterThanOrEqual(startedAt);
    expect(dataUpdatedAt).toBeLessThanOrEqual(Date.now());
  });

  it("does not open a database context for malformed list routes", async () => {
    await expect(getCachedListPageData("en", ["tags"])).resolves.toEqual({
      kind: "not-found",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
