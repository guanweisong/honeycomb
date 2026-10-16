import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const fetches: string[] = [];
let scrollState: { top?: number } | undefined;
let listState: {
  data?: { pages: Array<{ list?: unknown[] }> };
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetching: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
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

vi.mock("@/packages/ui/hooks/use-scroll-position", () => ({
  useScrollPosition: () => ({ left: 0, top: scrollState?.top ?? 0 }),
}));

vi.mock(
  "@/features/post/public/hooks/rq/post/use.infinite.query.post.list",
  () => ({
    default: () => ({
      ...listState,
      fetchNextPage: () => fetches.push("next"),
      refetch: () => fetches.push("refetch"),
    }),
  }),
);

vi.mock("@/packages/ui/navigation/blog-navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) =>
    key === "listEnd" ? "已经到底了" : key,
}));

import PostList from "./index";
import type { PostWithRelations as PostListViewModel } from "@/features/post/application/repository";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

const makePost = (
  overrides: Partial<PostListViewModel> &
    Pick<PostListViewModel, "id" | "type">,
): PostListViewModel => ({
  authorId: "author-1",
  categoryId: "category-1",
  commentStatus: EnableStatus.ENABLE,
  content: null,
  coverId: null,
  createdAt: null,
  excerpt: null,
  galleryLocation: null,
  galleryStyles: [],
  galleryTime: null,
  movieActors: [],
  movieDirectors: [],
  movieStyles: [],
  movieTime: null,
  quoteAuthor: null,
  quoteContent: null,
  status: PostStatus.PUBLISHED,
  title: null,
  updatedAt: null,
  views: 0,
  ...overrides,
});

const makeCover = (url: string) => ({
  color: null,
  createdAt: null,
  height: 600,
  id: `media-${url}`,
  key: url,
  name: url,
  size: 1024,
  type: "image/jpeg",
  updatedAt: null,
  url,
  width: 800,
});

const posts = [
  makePost({
    cover: makeCover("/article.jpg"),
    excerpt: { zh: "文章摘要" },
    id: "article",
    title: { zh: "文章标题" },
    type: PostType.ARTICLE,
  }),
  makePost({
    cover: makeCover("/movie.jpg"),
    id: "movie",
    movieTime: "2020-05-06T00:00:00.000Z",
    title: { zh: "电影标题" },
    type: PostType.MOVIE,
  }),
  makePost({
    cover: makeCover("/photo.jpg"),
    id: "photo",
    title: { zh: "照片标题" },
    type: PostType.PHOTOGRAPH,
  }),
  makePost({
    id: "quote",
    quoteAuthor: { zh: "引用作者" },
    quoteContent: { zh: "引用正文" },
    type: PostType.QUOTE,
  }),
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
      isFetching: false,
      isError: false,
      isFetchNextPageError: false,
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
          initData: { list: posts, total: posts.length },
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
    expect(
      container.querySelectorAll('a[href="/archives/article"]'),
    ).toHaveLength(3);
    expect(container.textContent).toContain("已经到底了");
  });

  it("omits unsafe media promotion and date formatting for incomplete data", async () => {
    listState.data = {
      pages: [
        {
          list: [
            {
              cover: { height: 600, url: "/incomplete.jpg", width: null },
              id: "incomplete",
              movieTime: null,
              title: { zh: "未完整电影" },
              type: "MOVIE",
            },
          ],
        },
      ],
    };

    await renderList();

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("未完整电影");
    expect(container.textContent).not.toContain("Invalid Date");
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
      listState.isFetching = isFetchingNextPage;

      await renderList();

      expect(fetches).toEqual([]);
    },
  );

  it("keeps loaded posts and stops automatic requests after a next-page error", async () => {
    listState.hasNextPage = true;
    listState.isFetchingNextPage = true;
    listState.isFetching = true;
    await renderList();

    listState.isFetchingNextPage = false;
    listState.isFetching = false;
    listState.isError = true;
    listState.isFetchNextPageError = true;
    await renderList();
    scrollState = { top: 100 };
    await renderList();

    expect(fetches).toEqual([]);
    expect(container.textContent).toContain("文章标题");
    expect(container.textContent).toContain("照片标题");
    expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
    expect(container.textContent).not.toContain("已经到底了");
  });

  it("retries a failed next page only when its accessible button is clicked", async () => {
    listState.hasNextPage = true;
    listState.isError = true;
    listState.isFetchNextPageError = true;
    await renderList();

    const retry = container.querySelector("button");
    expect(retry?.textContent).toBe("tryAgain");
    expect(retry?.type).toBe("button");
    expect(retry?.disabled).toBe(false);
    await act(async () => retry?.click());

    expect(fetches).toEqual(["next"]);
    listState.isFetchingNextPage = true;
    listState.isFetching = true;
    await renderList();
    expect(container.querySelector("button")?.disabled).toBe(true);
    await act(async () => container.querySelector("button")?.click());
    expect(fetches).toEqual(["next"]);
  });

  it("retries an initial error instead of claiming the feed has ended", async () => {
    listState.data = undefined;
    listState.isError = true;
    await renderList();

    expect(container.textContent).not.toContain("已经到底了");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => container.querySelector("button")?.click());

    expect(fetches).toEqual(["refetch"]);
  });

  it("does not report the end while an initial request is being retried", async () => {
    listState.data = undefined;
    listState.isFetching = true;
    await renderList();

    expect(container.textContent).not.toContain("已经到底了");
    expect(fetches).toEqual([]);
  });

  it("resumes automatic loading when the query recovers", async () => {
    listState.hasNextPage = true;
    listState.isError = true;
    listState.isFetchNextPageError = true;
    await renderList();
    expect(fetches).toEqual([]);

    listState.isError = false;
    listState.isFetchNextPageError = false;
    await renderList();

    expect(fetches).toEqual(["next"]);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows a loading indicator while fetching the next page", async () => {
    listState.hasNextPage = true;
    listState.isFetchingNextPage = true;
    listState.isFetching = true;
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
