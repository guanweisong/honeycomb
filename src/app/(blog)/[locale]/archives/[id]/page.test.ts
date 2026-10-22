import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLocale = vi.fn();
const mockGetTranslations = vi.fn();
const mockSettingIndex = vi.fn();
const mockPostDetail = vi.fn();
const mockRandomPosts = vi.fn();
const mockIncrementViews = vi.fn();
const mockClientIncrementViews = vi.fn();
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
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => mockGetLocale(),
  getTranslations: () => mockGetTranslations(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (_key: string, values: { count: number }) =>
    `${values.count} views`,
}));

vi.mock("@/app/_trpc/server", () => ({
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
vi.mock("@/app/lib/server/public-queries", () => ({
  getPublicComments: (...args: unknown[]) => mockComments(...args),
  getPublicPostDetail: (...args: unknown[]) => mockPostDetail(...args),
  getPublicRandomPosts: (...args: unknown[]) => mockRandomPosts(...args),
  getPublicSetting: (...args: unknown[]) => mockSettingIndex(...args),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    page: { incrementViews: { useMutation: () => ({ mutate: vi.fn() }) } },
    post: {
      incrementViews: {
        useMutation: () => ({ mutate: mockClientIncrementViews }),
      },
    },
  },
}));

vi.mock("@/features/post/public/PostInfo", () => ({
  default: ({ views, ...props }: Record<string, unknown>) =>
    React.createElement(
      "output",
      { "data-testid": "post-info" },
      JSON.stringify(props),
      views as React.ReactNode,
    ),
  PostCommentCount: () => React.createElement("span", null, "3 comments"),
}));

vi.mock("@/features/post/public/Tags", () => ({
  default: () => React.createElement("div", { "data-testid": "tags" }),
}));

vi.mock("@/components/SectionCard", () => ({
  default: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => React.createElement("section", { "data-title": title }, children),
}));

vi.mock("@/lib/i18n/blog-navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("@/features/comment/public/components/CommentClient", () => ({
  default: ({ id }: { id: string }) =>
    React.createElement("div", { "data-testid": "comment" }, id),
}));

vi.mock("@/features/media/public/RichText", () => ({
  RichText: ({ html }: { html?: string }) =>
    React.createElement("article", { "data-testid": "rich-text" }, html),
}));

import type { PostDetailResult } from "@/features/post/types/post.read-model";
import Archives, { generateMetadata } from "./page";
import { assertPostCategory, assertPostDetail } from "./page.utils";

// 输入夹具只允许真实详情字段；故障场景仍可显式省略正文和关联。
type DetailFixture = Pick<PostDetailResult, "id"> & {
  [
    Field in keyof Omit<
      PostDetailResult,
      "id" | "type" | "category" | "author" | "cover"
    >
  ]?: PostDetailResult[Field] | undefined;
} & {
  type: `${PostDetailResult["type"]}`;
  category?: Pick<NonNullable<PostDetailResult["category"]>, "id">;
  author?: Pick<NonNullable<PostDetailResult["author"]>, "name">;
  cover?: Pick<NonNullable<PostDetailResult["cover"]>, "url">;
};

const articleDetail: DetailFixture = {
  author: { name: "Alice" },
  authorId: "author-1",
  category: { id: "category-1" },
  content: { zh: "文章正文" },
  cover: { url: "/cover.jpg" },
  createdAt: "2024-01-02T03:04:05.000Z",
  excerpt: { zh: "文章摘要" },
  id: "111111111111111111111111",
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
        loading: "正在加载",
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
      { id: "111111111111111111111111", title: { zh: "当前文章" } },
      { id: "222222222222222222222222", title: { zh: "推荐文章" } },
    ]);
    mockIncrementViews.mockReset().mockResolvedValue(undefined);
    mockClientIncrementViews.mockReset();
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
      searchParams: Promise.resolve({}),
    });
    await act(async () => root.render(element));
  }

  function structuredData() {
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
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
    expect(
      container.querySelector('[data-testid="rich-text"]')?.textContent,
    ).toBe("文章正文");
    expect(
      container.querySelector('a[href="/archives/222222222222222222222222"]')
        ?.textContent,
    ).toBe("推荐文章");
    expect(
      container.querySelector('a[href="/archives/111111111111111111111111"]'),
    ).toBeNull();
    expect(container.querySelector('[data-title="猜你喜欢"]')).not.toBeNull();
    expect(mockIncrementViews).not.toHaveBeenCalled();
    expect(mockClientIncrementViews).toHaveBeenCalledOnce();
    expect(mockClientIncrementViews).toHaveBeenCalledWith(
      { id: "111111111111111111111111" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("renders the article while recommendations are still pending", async () => {
    mockGetTranslations.mockResolvedValue((key: string) => {
      if (key === "loading") return "Loading recommendations";
      if (key === "guessWhatYouLike") return "猜你喜欢";
      return key;
    });
    let resolveRecommendations!: (
      posts: { id: string; title: { zh: string } }[],
    ) => void;
    mockRandomPosts.mockReturnValue(
      new Promise((resolve) => {
        resolveRecommendations = resolve;
      }),
    );

    await renderArchive({ ...articleDetail });

    expect(container.querySelector("h1")?.textContent).toBe("文章标题");
    expect(
      container.querySelector('[data-testid="rich-text"]')?.textContent,
    ).toBe("文章正文");
    expect(container.querySelector('[data-testid="comment"]')).not.toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Loading recommendations",
    );
    expect(container.querySelector('[data-title="猜你喜欢"]')).toBeNull();

    await act(async () => {
      resolveRecommendations([
        { id: "111111111111111111111111", title: { zh: "当前文章" } },
        { id: "222222222222222222222222", title: { zh: "稍后推荐" } },
      ]);
    });

    expect(
      container.querySelector('a[href="/archives/222222222222222222222222"]')
        ?.textContent,
    ).toBe("稍后推荐");
    expect(
      container.querySelector('a[href="/archives/111111111111111111111111"]'),
    ).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("keeps the article readable after a delayed recommendation failure", async () => {
    let rejectRecommendations!: (error: Error) => void;
    mockRandomPosts.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRecommendations = reject;
      }),
    );

    await renderArchive({ ...articleDetail });
    await act(async () => {
      rejectRecommendations(new Error("Recommendations unavailable"));
    });

    expect(container.querySelector("h1")?.textContent).toBe("文章标题");
    expect(
      container.querySelector('[data-testid="rich-text"]')?.textContent,
    ).toBe("文章正文");
    expect(container.querySelector('[data-testid="comment"]')).not.toBeNull();
    expect(container.querySelector('[data-title="猜你喜欢"]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("omits recommendations when their query throws synchronously", async () => {
    mockRandomPosts.mockImplementation(() => {
      throw new Error("Recommendations unavailable");
    });

    await renderArchive({ ...articleDetail });

    expect(
      container.querySelector('[data-testid="rich-text"]')?.textContent,
    ).toBe("文章正文");
    expect(container.querySelector('[data-testid="comment"]')).not.toBeNull();
    expect(container.querySelector('[data-title="猜你喜欢"]')).toBeNull();
  });

  it("keeps JSON-LD inside its script context for hostile stored titles", async () => {
    await renderArchive({
      ...articleDetail,
      title: { zh: '</script><script data-attack="stored">alert(1)</script>' },
    });

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script?.innerHTML).not.toContain("<");
    expect(container.querySelector('script[data-attack="stored"]')).toBeNull();
    expect(structuredData().name).toBe(
      '</script><script data-attack="stored">alert(1)</script>',
    );
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
    mockRandomPosts.mockResolvedValue([{ id: "111111111111111111111111" }]);

    await renderArchive({ ...articleDetail, excerpt: undefined });

    expect(container.textContent).not.toContain("文章摘要");
    expect(container.querySelector('[data-title="猜你喜欢"]')).toBeNull();
  });

  it("rejects post details without a category relation", async () => {
    expect(() =>
      assertPostCategory({ ...articleDetail, category: undefined }),
    ).toThrow("Post 111111111111111111111111 is missing category relation");
  });

  it("maps missing post details to the Next.js not-found boundary", async () => {
    expect(() => assertPostDetail(null)).toThrow("NEXT_NOT_FOUND");
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
        params: Promise.resolve({
          id: "111111111111111111111111",
          locale: "zh",
        }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toMatchObject(expected);
  });

  it.each(["增长 100%", "Literal %20 title", "Bad %E0%A4%A escape"])(
    "preserves literal title text in metadata: %s",
    async (title) => {
      mockPostDetail.mockResolvedValue({
        ...articleDetail,
        title: { zh: title },
      });

      await expect(
        generateMetadata({
          params: Promise.resolve({
            id: "111111111111111111111111",
            locale: "zh",
          }),
          searchParams: Promise.resolve({}),
        }),
      ).resolves.toMatchObject({
        title,
        openGraph: { title },
        twitter: { title },
      });
    },
  );

  it("generates English canonical, language alternates and social defaults", async () => {
    mockSettingIndex.mockResolvedValue({
      siteName: { en: "Honeycomb", zh: "蜂巢" },
    });
    mockPostDetail.mockResolvedValue({
      ...articleDetail,
      title: { en: "Article title", zh: "文章标题" },
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "111111111111111111111111", locale: "en" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata).toMatchObject({
      title: "Article title",
      alternates: {
        canonical: "/en/archives/111111111111111111111111",
        languages: {
          en: "/en/archives/111111111111111111111111",
          zh: "/zh/archives/111111111111111111111111",
        },
      },
      openGraph: { images: ["/static/images/logo.png"] },
      twitter: {
        title: "Article title",
        images: ["/static/images/logo.png"],
      },
    });
  });
});
