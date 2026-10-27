import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPostListResult } from "@/features/post/types/post.read-model";
import { PostType } from "@/features/post/types/post.type";

const transport = vi.hoisted(() => ({ request: vi.fn() }));
let notifyIntersection:
  ((entries: Array<{ isIntersecting: boolean }>) => void) | undefined;
const intersect = () => notifyIntersection?.([{ isIntersecting: true }]);
let notificationsOnObserve = 1;
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpcClient: { post: { index: { query: transport.request } } },
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  ViewTransition: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/i18n/blog-navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import PostList from "@/features/post/public/components/PostList/index";

function page(id: string, total = 3): PublicPostListResult {
  return {
    total,
    list: [
      {
        id,
        excerpt: null,
        movieTime: null,
        quoteAuthor: null,
        quoteContent: null,
        title: { en: id },
        type: PostType.ARTICLE,
        updatedAt: null,
      },
    ],
  };
}

describe("PostList query recovery", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    transport.request.mockReset();
    notificationsOnObserve = 1;
    vi.stubGlobal(
      "IntersectionObserver",
      function (
        callback: (entries: Array<{ isIntersecting: boolean }>) => void,
      ) {
        return {
          observe: () => {
            notifyIntersection = callback;
            for (let index = 0; index < notificationsOnObserve; index++)
              callback([{ isIntersecting: true }]);
          },
          disconnect: () => {
            if (notifyIntersection === callback) notifyIntersection = undefined;
          },
        };
      },
    );
    client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
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
    client.clear();
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(categoryId = "original") {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <PostList
            queryParams={{ limit: 1, categoryId }}
            initData={page(`${categoryId}-first`)}
          />
        </QueryClientProvider>,
      ),
    );
  }

  it("preserves pages through failure and resumes pagination after explicit retry succeeds", async () => {
    let finishRetry: ((result: PublicPostListResult) => void) | undefined;
    transport.request
      .mockRejectedValueOnce(new Error("network failure"))
      .mockImplementationOnce(
        () =>
          new Promise<PublicPostListResult>((resolve) => {
            finishRetry = resolve;
          }),
      )
      .mockResolvedValueOnce(page("third"));

    await render();
    await render();
    expect(container.textContent).toContain("original-first");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(transport.request).toHaveBeenCalledTimes(1);

    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("button")?.disabled).toBe(true);
    expect(container.textContent).toContain("original-first");
    expect(transport.request).toHaveBeenCalledTimes(2);
    expect(finishRetry).toBeTypeOf("function");
    await act(async () => finishRetry?.(page("second")));

    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      2, 2, 3,
    ]);
    expect(container.textContent).toContain("original-first");
    expect(container.textContent).toContain("second");
    expect(container.textContent).toContain("third");
    expect(container.textContent).toContain("listEnd");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("coalesces repeated observer notifications while the next page is pending", async () => {
    notificationsOnObserve = 3;
    let finish: ((result: PublicPostListResult) => void) | undefined;
    transport.request.mockImplementationOnce(
      () =>
        new Promise<PublicPostListResult>((resolve) => {
          finish = resolve;
        }),
    );
    await render();
    await act(async () => {
      intersect();
      intersect();
    });
    expect(transport.request).toHaveBeenCalledTimes(1);
    await act(async () => finish?.(page("second", 2)));
    expect(container.textContent).toContain("original-first");
    expect(container.textContent).toContain("second");
    expect(container.textContent).toContain("listEnd");
  });

  it("does not carry a failed query's pause into new filters", async () => {
    transport.request
      .mockRejectedValueOnce(new Error("original category failed"))
      .mockResolvedValueOnce(page("new-second", 2));
    await render();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    await render("new");

    expect(
      transport.request.mock.calls.map(([input]) => input.categoryId),
    ).toEqual(["original", "new"]);
    expect(container.textContent).toContain("new-first");
    expect(container.textContent).toContain("new-second");
    expect(container.textContent).not.toContain("original-first");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
