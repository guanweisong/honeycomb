import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuType } from "@/packages/domain/navigation/menu";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
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

vi.mock("@/packages/trpc/api", () => ({
  createServerClient: mocks.createServerClient,
}));

import {
  getPublicComments,
  getPublicMenu,
  getPublicPageDetail,
  getPublicPostDetail,
  getPublicSetting,
  getPublicLinks,
} from "./public-queries";

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
    expect(mocks.createServerClient).toHaveBeenCalledTimes(5);
  });
});
