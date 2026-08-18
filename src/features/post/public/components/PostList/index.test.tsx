import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetches: string[] = [];
let scrollState: { top?: number } | undefined;
let listState: {
  data?: { pages: Array<{ list?: unknown[] }> };
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    ViewTransition: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("next/image", () => ({
  default: ({
    priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) =>
    React.createElement("img", {
      ...props,
      "data-priority": priority ? "true" : "false",
    }),
}));

vi.mock("ahooks", () => ({
  useScroll: () => scrollState,
}));

vi.mock("@/features/post/public/hooks/rq/post/use.infinite.query.post.list", () => ({
  default: () => ({
    ...listState,
    fetchNextPage: () => fetches.push("next"),
  }),
}));

vi.mock("@/packages/ui/navigation/blog-navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => React.createElement("a", { href }, children),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) =>
    key === "listEnd" ? "已经到底了" : key,
}));

import PostList from "./index";

const posts = [
  {
    cover: { height: 600, url: "/article.jpg", width: 800 },
    excerpt: { zh: "文章摘要" },
    id: "article",
    title: { zh: "文章标题" },
    type: "ARTICLE",
  },
  {
    cover: { height: 600, url: "/movie.jpg", width: 800 },
    id: "movie",
    movieTime: "2020-05-06T00:00:00.000Z",
    title: { zh: "电影标题" },
    type: "MOVIE",
  },
  {
    cover: { height: 600, url: "/photo.jpg", width: 800 },
    id: "photo",
    title: { zh: "照片标题" },
    type: "PHOTOGRAPH",
  },
  {
    id: "quote",
    quoteAuthor: { zh: "引用作者" },
    quoteContent: { zh: "引用正文" },
    type: "QUOTE",
  },
];

describe("PostList", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    fetches.length = 0;
    scrollState = { top: 0 };
    listState = {
      data: { pages: [{ list: posts }] },
      hasNextPage: false,
      isFetchingNextPage: false,
    };
    Object.defineProperty(document.body, "scrollHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderList() {
    await act(async () => {
      root.render(
        React.createElement(PostList, {
          initData: { list: posts as never[], total: posts.length },
          queryParams: { limit: 10 },
        }),
      );
    });
  }

  it("renders article, movie, photograph and quote cards", async () => {
    await renderList();

    expect(container.textContent).toContain("文章标题");
    expect(container.textContent).toContain("文章摘要");
    expect(container.textContent).toContain("电影标题 (2020)");
    expect(container.textContent).toContain("照片标题");
    expect(container.textContent).toContain("“引用正文” —— 引用作者");
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(container.querySelector("img")?.getAttribute("data-priority")).toBe(
      "true",
    );
    expect(container.querySelectorAll('a[href="/archives/article"]')).toHaveLength(
      3,
    );
    expect(container.textContent).toContain("已经到底了");
  });

  it("loads the next page when scrolling within 300px of the bottom", async () => {
    listState.hasNextPage = true;
    await renderList();

    expect(fetches).toEqual(["next"]);
    expect(container.textContent).not.toContain("已经到底了");
  });

  it.each([
    ["the next request is already pending", { top: 0 }, true, true],
    ["the viewport is far from the bottom", { top: -500 }, true, false],
    ["there is no next page", { top: 0 }, false, false],
  ])(
    "does not load when %s",
    async (_label, scroll, hasNextPage, isFetchingNextPage) => {
      scrollState = scroll;
      listState.hasNextPage = hasNextPage;
      listState.isFetchingNextPage = isFetchingNextPage;

      await renderList();

      expect(fetches).toEqual([]);
    },
  );

  it("shows a loading indicator while fetching the next page", async () => {
    listState.hasNextPage = true;
    listState.isFetchingNextPage = true;
    await renderList();

    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("treats missing page lists as an empty completed feed", async () => {
    listState.data = { pages: [{}] };
    await renderList();

    expect(container.querySelectorAll('a[href^="/archives/"]')).toHaveLength(0);
    expect(container.textContent).toContain("已经到底了");
  });
});
