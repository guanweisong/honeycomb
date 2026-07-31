import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLocale = vi.fn();
const mockGetTranslations = vi.fn();
const mockSettingIndex = vi.fn();
const mockPostDetail = vi.fn();
const mockRandomPosts = vi.fn();
const mockIncrementViews = vi.fn();
const mockComments = vi.fn();

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    ViewTransition: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
  getTranslations: () => mockGetTranslations(),
}));

vi.mock("@/packages/trpc/api", () => ({
  createServerClient: async () => ({
    comment: { listByRef: mockComments },
    post: {
      detail: mockPostDetail,
      getRandomByCategory: mockRandomPosts,
      incrementViews: mockIncrementViews,
    },
    setting: { index: mockSettingIndex },
  }),
}));

vi.mock("@/app/(blog)/components/PostInfo", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement(
      "output",
      { "data-testid": "post-info" },
      JSON.stringify(props),
    ),
}));

vi.mock("@/app/(blog)/components/Tags", () => ({
  default: () => React.createElement("div", { "data-testid": "tags" }),
}));

vi.mock("@/app/(blog)/components/Card", () => ({
  default: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => React.createElement("section", { "data-title": title }, children),
}));

vi.mock("@/app/(blog)/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => React.createElement("a", { href }, children),
}));

vi.mock("@/app/(blog)/components/Comment", () => ({
  default: ({ id }: { id: string }) =>
    React.createElement("div", { "data-testid": "comment" }, id),
}));

vi.mock("@/app/(blog)/components/PageTitle", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("h1", null, children),
}));

vi.mock("@/app/(blog)/components/RichText", () => ({
  RichText: ({ html }: { html?: string }) =>
    React.createElement("article", { "data-testid": "rich-text" }, html),
}));

import Archives, {
  generateMetadata,
  generateStaticParams,
} from "./page";

type DetailFixture = Record<string, unknown> & {
  category?: { id: string };
  id: string;
  type: "ARTICLE" | "MOVIE" | "PHOTOGRAPH" | "QUOTE";
};

const articleDetail: DetailFixture = {
  author: { name: "Alice" },
  authorId: "author-1",
  category: { id: "category-1" },
  content: { zh: "文章正文" },
  cover: { url: "/cover.jpg" },
  createdAt: "2024-01-02T03:04:05.000Z",
  excerpt: { zh: "文章摘要" },
  id: "post-1",
  imagesInContent: [],
  title: { zh: "文章标题" },
  type: "ARTICLE",
  views: 7,
};

describe("archives page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    mockGetLocale.mockReset().mockResolvedValue("zh");
    mockGetTranslations.mockReset().mockResolvedValue((key: string) => {
      const values: Record<string, string> = {
        guessWhatYouLike: "猜你喜欢",
        quoteFrom: "摘自",
        released: "上映",
        shotIn: "摄于",
      };
      return values[key] ?? key;
    });
    mockSettingIndex.mockReset().mockResolvedValue({
      siteName: { zh: "蜂巢" },
    });
    mockPostDetail.mockReset().mockResolvedValue({ ...articleDetail });
    mockRandomPosts.mockReset().mockResolvedValue([
      { id: "post-1", title: { zh: "当前文章" } },
      { id: "post-2", title: { zh: "推荐文章" } },
    ]);
    mockIncrementViews.mockReset().mockResolvedValue(undefined);
    mockComments.mockReset().mockResolvedValue({ total: 3 });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderArchive(detail: DetailFixture) {
    mockPostDetail.mockResolvedValue(detail);
    const element = await Archives({
      params: Promise.resolve({ id: detail.id, locale: "zh" }),
    });
    await act(async () => root.render(element));
  }

  function structuredData() {
    const script = container.querySelector('script[type="application/ld+json"]');
    if (!script) throw new Error("Expected JSON-LD structured data");
    return JSON.parse(script.textContent ?? "") as Record<string, unknown>;
  }

  it("renders article content, metadata and related posts", async () => {
    await renderArchive({ ...articleDetail });

    expect(structuredData()).toEqual({
      "@context": "https://schema.org",
      "@type": "Article",
      description: "文章摘要",
      image: "/cover.jpg",
      name: "文章标题",
    });
    expect(container.querySelector("h1")?.textContent).toBe("文章标题");
    expect(container.querySelector('[data-testid="rich-text"]')?.textContent).toBe(
      "文章正文",
    );
    expect(container.querySelector('a[href="/archives/post-2"]')?.textContent).toBe(
      "推荐文章",
    );
    expect(container.querySelector('a[href="/archives/post-1"]')).toBeNull();
    expect(container.querySelector('[data-title="猜你喜欢"]')).not.toBeNull();
  });

  it("renders movie year, release date and Movie structured data", async () => {
    await renderArchive({
      ...articleDetail,
      movieTime: "2020-05-06T00:00:00.000Z",
      title: { zh: "电影标题" },
      type: "MOVIE",
    });

    expect(container.querySelector("h1")?.textContent).toBe("电影标题 (2020)");
    expect(container.textContent).toContain("上映: 2020-05-06");
    expect(structuredData()).toMatchObject({
      "@type": "Movie",
      name: "电影标题 (2020)",
    });
  });

  it("renders photograph time and localized location", async () => {
    await renderArchive({
      ...articleDetail,
      galleryLocation: { zh: "杭州" },
      galleryTime: "2022-03-04T00:00:00.000Z",
      title: { zh: "照片标题" },
      type: "PHOTOGRAPH",
    });

    expect(container.textContent).toContain("2022-03-04");
    expect(container.textContent).toContain("摄于");
    expect(container.textContent).toContain("杭州");
    expect(structuredData()).toMatchObject({ "@type": "Photograph" });
  });

  it("renders quotes without article rich text", async () => {
    await renderArchive({
      ...articleDetail,
      quoteAuthor: { zh: "引用作者" },
      quoteContent: { zh: "引用正文" },
      title: undefined,
      type: "QUOTE",
    });

    expect(container.querySelector("h1")?.textContent).toBe("引用正文");
    expect(container.textContent).toContain("摘自: 引用作者");
    expect(container.querySelector('[data-testid="rich-text"]')).toBeNull();
    expect(structuredData()).toEqual({
      "@context": "https://schema.org",
      "@type": "Quotation",
      name: "引用正文",
    });
  });

  it("omits excerpt and recommendations when neither is available", async () => {
    mockRandomPosts.mockResolvedValue([{ id: "post-1" }]);

    await renderArchive({ ...articleDetail, excerpt: undefined });

    expect(container.textContent).not.toContain("文章摘要");
    expect(container.querySelector('[data-title="猜你喜欢"]')).toBeNull();
  });

  it("rejects post details without a category relation", async () => {
    mockPostDetail.mockResolvedValue({
      ...articleDetail,
      category: undefined,
    });

    await expect(
      Archives({
        params: Promise.resolve({ id: "post-1", locale: "zh" }),
      }),
    ).rejects.toThrow("Post post-1 is missing category relation");
  });

  it("maps missing post details to the Next.js not-found boundary", async () => {
    mockPostDetail.mockResolvedValue(null);

    await expect(
      Archives({
        params: Promise.resolve({ id: "missing", locale: "zh" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each([
    [
      { ...articleDetail },
      {
        description: "蜂巢",
        openGraph: {
          description: "蜂巢",
          title: "文章标题",
          type: "article",
        },
        title: "文章标题",
      },
    ],
    [
      {
        ...articleDetail,
        movieTime: "2020-05-06T00:00:00.000Z",
        title: { zh: "电影标题" },
        type: "MOVIE" as const,
      },
      {
        description: "蜂巢",
        openGraph: {
          description: "蜂巢",
          title: "电影标题 (2020)",
          type: "article",
        },
        title: "电影标题 (2020)",
      },
    ],
  ])("generates detail metadata for %#", async (detail, expected) => {
    mockPostDetail.mockResolvedValue(detail);

    await expect(
      generateMetadata({
        params: Promise.resolve({ id: "post-1" }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toEqual(expected);
  });

  it("does not pre-render unbounded archive parameters", async () => {
    await expect(generateStaticParams()).resolves.toEqual([]);
  });
});
