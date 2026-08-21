import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLocale = vi.fn();
const mockGetTranslations = vi.fn();
const mockSettingIndex = vi.fn();
const mockMenuIndex = vi.fn();
const mockTagIndex = vi.fn();
const mockUserDetail = vi.fn();
const mockPostIndex = vi.fn();

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
  getTranslations: () => mockGetTranslations(),
}));

vi.mock("@/packages/trpc/api", () => ({
  createServerClient: async () => ({
    menu: { index: mockMenuIndex },
    post: { index: mockPostIndex },
    setting: { index: mockSettingIndex },
    tag: { index: mockTagIndex },
    user: { detail: mockUserDetail },
  }),
}));

vi.mock("@/features/post/public/components/PostList", () => ({
  default: ({ queryParams }: { queryParams: Record<string, unknown> }) =>
    React.createElement(
      "output",
      { "data-testid": "post-list" },
      JSON.stringify(queryParams),
    ),
}));

vi.mock("@/app/(blog)/components/NoData", () => ({
  default: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "no-data" }, title),
}));

import List, { generateMetadata, generateStaticParams } from "./page";

describe("blog list page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    mockGetLocale.mockReset().mockResolvedValue("zh");
    mockGetTranslations
      .mockReset()
      .mockResolvedValue((key: string, values?: Record<string, string>) => {
        if (key === "postUnderTag") return `标签：${values?.tag ?? ""}`;
        if (key === "postUnderAuthor") return `作者：${values?.author ?? ""}`;
        if (key === "emptyTip") return "暂无文章";
        return key;
      });
    mockSettingIndex.mockReset().mockResolvedValue({
      siteName: { zh: "蜂巢" },
      siteSubName: { zh: "记录值得分享的事" },
    });
    mockMenuIndex.mockReset().mockResolvedValue({
      list: [
        {
          id: "category-1",
          path: "tech",
          title: { zh: "技术" },
        },
      ],
    });
    mockTagIndex.mockReset().mockResolvedValue({
      list: [{ id: "resolved-tag", name: { zh: "标签名称" } }],
    });
    mockUserDetail.mockReset().mockResolvedValue({
      id: "resolved-author",
      name: "作者名称",
    });
    mockPostIndex.mockReset().mockResolvedValue({
      list: [{ id: "post-1" }],
      total: 1,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderList(slug: string[]) {
    const element = await List({
      params: Promise.resolve({ locale: "zh", slug }),
    });
    await act(async () => root.render(element));
  }

  function renderedQuery() {
    const output = container.querySelector('[data-testid="post-list"]');
    if (!output) throw new Error("Expected a rendered post list");
    return JSON.parse(output.textContent ?? "") as Record<string, unknown>;
  }

  it("resolves category paths to the category id used by the post query", async () => {
    await renderList(["category", "tech"]);

    expect(renderedQuery()).toEqual({
      categoryId: "category-1",
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
    });
    expect(container.textContent).not.toContain("技术_蜂巢");
  });

  it("uses the resolved tag id and localized tag heading", async () => {
    await renderList(["tags", "tag-from-url"]);

    expect(renderedQuery()).toEqual({
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
      tagId: "resolved-tag",
    });
    expect(container.textContent).toContain("标签：标签名称");
  });

  it("keeps an unknown tag id and renders the localized empty state", async () => {
    mockTagIndex.mockResolvedValue({ list: [] });
    mockPostIndex.mockResolvedValue({ list: [], total: 0 });

    await renderList(["tags", "unknown-tag"]);

    expect(container.textContent).toContain("标签：");
    expect(
      container.querySelector('[data-testid="no-data"]')?.textContent,
    ).toBe("暂无文章");
  });

  it("uses the resolved author id and author heading", async () => {
    await renderList(["authors", "author-from-url"]);

    expect(renderedQuery()).toEqual({
      authorId: "resolved-author",
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
    });
    expect(container.textContent).toContain("作者：作者名称");
  });

  it("keeps an unknown author id without inventing an author name", async () => {
    mockUserDetail.mockResolvedValue(null);

    await renderList(["authors", "unknown-author"]);

    expect(renderedQuery()).toMatchObject({ authorId: "unknown-author" });
    expect(container.textContent).toContain("作者：");
  });

  it("uses the base published-post query when no list type is present", async () => {
    await renderList([]);

    expect(renderedQuery()).toEqual({
      limit: 10,
      sortField: "createdAt",
      status: ["PUBLISHED"],
    });
  });

  it.each([
    [
      ["category", "tech"],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "技术_蜂巢",
          type: "website",
        },
        title: "技术_蜂巢",
      },
    ],
    [
      ["tags", "tag-from-url"],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "标签：标签名称",
          type: "website",
        },
        title: "标签：标签名称",
      },
    ],
    [
      ["authors", "author-from-url"],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "作者：作者名称",
          type: "website",
        },
        title: "作者：作者名称",
      },
    ],
    [
      [],
      {
        description: "记录值得分享的事",
        openGraph: {
          description: "记录值得分享的事",
          images: ["/static/images/logo.png"],
          title: "蜂巢",
          type: "website",
        },
        title: "蜂巢",
      },
    ],
  ] as const)("generates localized metadata for %j", async (slug, expected) => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: [...slug] }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toEqual(expected);
  });

  it("uses an empty name when metadata cannot resolve a tag", async () => {
    mockTagIndex.mockResolvedValue({ list: [] });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: ["tags", "unknown-tag"] }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe("标签：");
  });

  it("does not pre-render unbounded list parameters", async () => {
    await expect(generateStaticParams()).resolves.toEqual([]);
  });
});
