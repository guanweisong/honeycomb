import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/app/(blog)/messages/en.json";
import zhMessages from "@/app/(blog)/messages/zh.json";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const fetches: string[] = [];
const fetchOptions: Array<{ cancelRefetch: boolean } | undefined> = [];
const observers: Array<{
  callback: (entries: Array<{ isIntersecting: boolean }>) => void;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options?: IntersectionObserverInit;
}> = [];

function intersect(isIntersecting = true) {
  observers.at(-1)?.callback([{ isIntersecting }]);
}
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

vi.mock("@/features/post/public/use-post-list", () => ({
  default: () => ({
    ...listState,
    fetchNextPage: (options?: { cancelRefetch: boolean }) => {
      fetches.push("next");
      fetchOptions.push(options);
      return Promise.resolve();
    },
    refetch: () => fetches.push("refetch"),
  }),
}));

vi.mock("@/lib/i18n/blog-navigation", () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

import PostList from "./index";
import type { PublicPostListItem as PostListViewModel } from "@/features/post/types";
import { PostType } from "@/features/post/post-type";

const makePost = (
  overrides: Partial<PostListViewModel> &
    Pick<PostListViewModel, "id" | "type">,
): PostListViewModel => ({
  excerpt: null,
  movieTime: null,
  quoteAuthor: null,
  quoteContent: null,
  title: null,
  updatedAt: null,
  ...overrides,
});

const makeCover = (url: string) => ({ url, height: 600, width: 800 });

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
    fetchOptions.length = 0;
    observers.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      function (
        callback: (entries: Array<{ isIntersecting: boolean }>) => void,
        options?: IntersectionObserverInit,
      ) {
        const observer = {
          callback,
          options,
          observe: vi.fn(),
          disconnect: vi.fn(),
        };
        observers.push(observer);
        return observer;
      },
    );
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
      value: 10000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderList(locale: "zh" | "en" = "zh") {
    await act(async () => {
      root.render(
        <NextIntlClientProvider
          locale={locale}
          messages={locale === "en" ? enMessages : zhMessages}
          timeZone="UTC"
        >
          <PostList
            initData={{ list: posts, total: posts.length }}
            queryParams={{ limit: 10 }}
          />
        </NextIntlClientProvider>,
      );
    });
  }

  it.each([
    ["en", ["Article", "Movie", "Gallery"]],
    ["zh", ["文章", "电影", "画廊"]],
  ] as const)("localizes cover badges for %s", async (locale, labels) => {
    await renderList(locale);
    const badges = Array.from(
      container.querySelectorAll("a.relative span"),
    ).map((element) => element.textContent);
    expect(badges).toEqual(labels);
    expect(container.querySelectorAll("a.relative")).toHaveLength(3);
  });

  it.each([
    ["1895-12-28", " (1895)"],
    ["2020-05-06T00:00:00.000Z", " (2020)"],
    ["2200-01-01", " (2200)"],
    [null, ""],
    [undefined, ""],
    ["not-a-date", ""],
    ["   ", ""],
  ])("omits empty movie year decorations for %s", async (movieTime, suffix) => {
    listState.data = { pages: [{ list: [{ ...posts[1], movieTime }] }] };
    await renderList();
    expect(container.querySelector("a.block.text-lg")?.textContent).toBe(
      `电影标题${suffix}`,
    );
  });

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
    expect(container.textContent).toContain(zhMessages.PostList.listEnd);
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

  it("observes a 300px sentinel and loads only when it intersects", async () => {
    listState.hasNextPage = true;
    await renderList();

    expect(fetches).toEqual([]);
    expect(observers.at(-1)?.options).toEqual({ rootMargin: "300px" });
    expect(observers.at(-1)?.observe).toHaveBeenCalledWith(
      container.querySelector('[data-testid="post-list-sentinel"]'),
    );
    await act(async () => intersect());
    expect(fetches).toEqual(["next"]);
    expect(fetchOptions).toEqual([{ cancelRefetch: false }]);
    expect(container.textContent).not.toContain(zhMessages.PostList.listEnd);
  });

  it.each([
    ["the next request is already pending", true, true, true],
    ["the sentinel is outside the viewport", false, true, false],
    ["there is no next page", true, false, false],
  ])(
    "does not load when %s",
    async (_label, visible, hasNextPage, isFetchingNextPage) => {
      listState.hasNextPage = hasNextPage;
      listState.isFetchingNextPage = isFetchingNextPage;
      listState.isFetching = isFetchingNextPage;

      await renderList();
      await act(async () => intersect(visible));

      expect(fetches).toEqual([]);
    },
  );

  it("does not overlap an in-flight background refresh", async () => {
    listState.hasNextPage = true;
    listState.isFetching = true;
    await renderList();
    await act(async () => intersect());
    expect(fetches).toEqual([]);
  });

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
    await act(async () => intersect());

    expect(fetches).toEqual([]);
    expect(container.textContent).toContain("文章标题");
    expect(container.textContent).toContain("照片标题");
    expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
    expect(container.textContent).not.toContain(zhMessages.PostList.listEnd);
  });

  it("retries a failed next page only when its accessible button is clicked", async () => {
    listState.hasNextPage = true;
    listState.isError = true;
    listState.isFetchNextPageError = true;
    await renderList();

    const retry = container.querySelector("button");
    expect(retry?.textContent).toBe(zhMessages.Error.tryAgain);
    expect(retry?.type).toBe("button");
    expect(retry?.disabled).toBe(false);
    await act(async () => retry?.click());

    expect(fetches).toEqual(["next"]);
    expect(fetchOptions).toEqual([{ cancelRefetch: false }]);
    listState.isFetchingNextPage = true;
    listState.isFetching = true;
    await renderList();
    expect(container.querySelector("button")?.disabled).toBe(true);
    await act(async () => container.querySelector("button")?.click());
    expect(fetches).toEqual(["next"]);
    expect(fetchOptions).toEqual([{ cancelRefetch: false }]);
  });

  it("retries an initial error instead of claiming the feed has ended", async () => {
    listState.data = undefined;
    listState.isError = true;
    await renderList();

    expect(container.textContent).not.toContain(zhMessages.PostList.listEnd);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => container.querySelector("button")?.click());

    expect(fetches).toEqual(["refetch"]);
  });

  it("does not report the end while an initial request is being retried", async () => {
    listState.data = undefined;
    listState.isFetching = true;
    await renderList();

    expect(container.textContent).not.toContain(zhMessages.PostList.listEnd);
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
    await act(async () => intersect());

    expect(fetches).toEqual(["next"]);
    expect(fetchOptions).toEqual([{ cancelRefetch: false }]);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("disconnects the sentinel when unmounted", async () => {
    listState.hasNextPage = true;
    await renderList();
    const observer = observers.at(-1);
    expect(observer).toBeDefined();
    await act(async () => root.render(null));
    expect(observer?.disconnect).toHaveBeenCalledOnce();
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
    expect(container.textContent).toContain(zhMessages.PostList.listEnd);
  });
});
