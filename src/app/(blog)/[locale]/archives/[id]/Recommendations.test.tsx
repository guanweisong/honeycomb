import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MultiLangEnum } from "@/lib/i18n/multi-lang";

const { mockPrefetch, mockCreateServerClient, mockGetRandomByCategory } =
  vi.hoisted(() => ({
    mockPrefetch: vi.fn(),
    mockCreateServerClient: vi.fn(),
    mockGetRandomByCategory: vi.fn(),
  }));

vi.mock("next/cache", () => ({ prefetch: mockPrefetch }));
vi.mock("@/app/trpc/server", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));
vi.mock("@/components/SectionCard", async () => {
  const React = await import("react");
  return {
    default: ({ children, title }: React.PropsWithChildren<{ title: string }>) =>
      React.createElement("section", { "data-title": title }, children),
  };
});
vi.mock("@/app/(blog)/lib/blog-navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      children,
      href,
    }: React.PropsWithChildren<{ href: string }>) =>
      React.createElement("a", { href }, children),
  };
});

import Recommendations from "./Recommendations";

const props = {
  categoryId: "category-1",
  locale: MultiLangEnum.Zh,
  postId: "111111111111111111111111",
  title: "猜你喜欢",
};

describe("article recommendations", () => {
  beforeEach(() => {
    mockPrefetch.mockReset().mockResolvedValue(undefined);
    mockCreateServerClient.mockReset().mockResolvedValue({
      post: { getRandomByCategory: mockGetRandomByCategory },
    });
    mockGetRandomByCategory.mockReset().mockResolvedValue([]);
  });

  it("waits for per-link prefetch before querying recommendations", async () => {
    const prefetchPending = Promise.withResolvers<void>();
    const recommendationsPending = Promise.withResolvers<
      {
        id: string;
        title: { zh: string };
      }[]
    >();
    mockPrefetch.mockReturnValue(prefetchPending.promise);
    mockGetRandomByCategory.mockReturnValue(recommendationsPending.promise);

    const pending = Recommendations(props);
    let componentSettled = false;
    void pending.then(
      () => {
        componentSettled = true;
      },
      () => {
        componentSettled = true;
      },
    );

    await vi.waitFor(() => expect(mockPrefetch).toHaveBeenCalledOnce());
    expect(mockGetRandomByCategory).not.toHaveBeenCalled();
    expect(componentSettled).toBe(false);

    prefetchPending.resolve();
    await vi.waitFor(() =>
      expect(mockGetRandomByCategory).toHaveBeenCalledWith({
        categoryId: "category-1",
      }),
    );
    expect(mockCreateServerClient).toHaveBeenCalledWith({
      requestContext: { requestId: "public-recommendation-prefetch" },
      skipRequestObservability: true,
    });
    expect(componentSettled).toBe(false);

    recommendationsPending.resolve([
      { id: props.postId, title: { zh: "当前文章" } },
      { id: "222222222222222222222222", title: { zh: "推荐文章" } },
    ]);
    const result = await pending;
    const markup = renderToStaticMarkup(result);

    expect(markup).toContain("推荐文章");
    expect(markup).not.toContain("当前文章");
    expect(markup).toContain('href="/archives/222222222222222222222222"');
    expect(componentSettled).toBe(true);
  });

  it("omits recommendations when their query fails", async () => {
    mockGetRandomByCategory.mockRejectedValue(
      new Error("Recommendations unavailable"),
    );

    await expect(Recommendations(props)).resolves.toBeNull();
  });

  it("omits the module when only the current article is returned", async () => {
    mockGetRandomByCategory.mockResolvedValue([
      { id: props.postId, title: { zh: "当前文章" } },
    ]);

    await expect(Recommendations(props)).resolves.toBeNull();
  });
});
