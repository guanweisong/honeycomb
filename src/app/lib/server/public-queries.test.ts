import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { MenuType } from "@/features/menu/types/menu.type";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  connection: vi.fn(),
  setting: vi.fn(),
  menu: vi.fn(),
  post: vi.fn(),
  page: vi.fn(),
  comments: vi.fn(),
  links: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    cache: <Args extends unknown[], Result>(fn: (...args: Args) => Result) => {
      const values = new Map<string, Result>();
      return (...args: Args) => {
        const key = JSON.stringify(args);
        if (!values.has(key)) values.set(key, fn(...args));
        return values.get(key) as Result;
      };
    },
  };
});

vi.mock("@/app/_trpc/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("next/cache", () => ({
  cacheLife: mocks.cacheLife,
  cacheTag: mocks.cacheTag,
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));

import {
  getPublicComments,
  getPublicMenu,
  getPublicPageDetail,
  getPublicPostDetail,
  getPublicSetting,
  getPublicLinks,
} from "@/app/lib/server/public-queries";

describe("public server queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerClient.mockResolvedValue({
      comment: { listByRef: mocks.comments },
      link: { index: mocks.links },
      menu: { index: mocks.menu },
      page: { detail: mocks.page },
      post: { detail: mocks.post },
      setting: { index: mocks.setting },
    });
  });

  it("keeps friendly links beyond the first bounded page", async () => {
    mocks.links
      .mockResolvedValueOnce({ list: [{ id: "first" }], total: 101 })
      .mockResolvedValueOnce({ list: [{ id: "last" }], total: 101 });
    expect(await getPublicLinks()).toEqual({
      list: [{ id: "first" }, { id: "last" }],
      total: 101,
    });
    expect(mocks.links).toHaveBeenNthCalledWith(1, {
      page: 1,
      limit: 100,
      status: ["ENABLE"],
    });
    expect(mocks.links).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit: 100,
      status: ["ENABLE"],
    });
  });

  it("deduplicates equivalent scalar reads", async () => {
    await Promise.all([
      getPublicSetting(),
      getPublicSetting(),
      getPublicMenu(),
      getPublicMenu(),
      getPublicPostDetail("post-1"),
      getPublicPostDetail("post-1"),
      getPublicPageDetail("page-1"),
      getPublicPageDetail("page-1"),
      getPublicComments("post-1", MenuType.CATEGORY),
      getPublicComments("post-1", MenuType.CATEGORY),
    ]);

    expect(mocks.setting).toHaveBeenCalledOnce();
    expect(mocks.menu).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.page).toHaveBeenCalledOnce();
    expect(mocks.comments).toHaveBeenCalledOnce();
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.createServerClient).toHaveBeenCalledTimes(5);
    expect(mocks.cacheLife).toHaveBeenCalledTimes(4);
    expect(mocks.cacheTag).toHaveBeenCalledWith("public.layout");
    expect(mocks.createServerClient).toHaveBeenCalledWith({
      requestContext: { requestId: "next-public-cache-fill" },
      skipRequestObservability: true,
    });
  });
  it("returns serializable absence before a missing post crosses the remote cache", async () => {
    mocks.post.mockRejectedValueOnce(new TRPCError({ code: "NOT_FOUND" }));
    await expect(getPublicPostDetail("missing-post")).resolves.toBeNull();
    expect(mocks.cacheTag).toHaveBeenCalledWith(
      "public.post-index",
      "public.post.missing-post",
    );
  });

  it.each([
    new TRPCError({ code: "INTERNAL_SERVER_ERROR" }),
    new TRPCError({ code: "FORBIDDEN" }),
    new Error("NOT_FOUND is not a typed domain error"),
  ])("does not turn other post failures into absence: %s", async (error) => {
    mocks.post.mockRejectedValueOnce(error);
    await expect(getPublicPostDetail(`error-${error.message}`)).rejects.toBe(
      error,
    );
  });
});
