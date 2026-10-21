import React, { act, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { postRequest, pageRequest } = vi.hoisted(() => ({
  postRequest:
    vi.fn<(input: { id: string }) => Promise<{ views?: number | null }>>(),
  pageRequest:
    vi.fn<(input: { id: string }) => Promise<{ views?: number | null }>>(),
}));

vi.mock("@/lib/trpc/client/trpc", async () => {
  const { useMutation } = await import("@tanstack/react-query");
  return {
    trpc: {
      post: {
        incrementViews: {
          useMutation: () => useMutation({ mutationFn: postRequest }),
        },
      },
      page: {
        incrementViews: {
          useMutation: () => useMutation({ mutationFn: pageRequest }),
        },
      },
    },
  };
});
vi.mock("next-intl", () => ({
  useTranslations: () => (_key: string, values: { count: number }) =>
    `${values.count} 次浏览`,
}));

import { PageViewTracker } from "@/features/page/public/PageViewTracker";
import { PostViewTracker } from "@/features/post/public/PostViewTracker";

function deferred() {
  let resolve!: (value: { views?: number | null }) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<{ views?: number | null }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ViewTracker with real QueryClient and MutationObserver", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    postRequest.mockReset();
    pageRequest.mockReset();
  });
  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
  });
  const render = async (child: React.ReactNode) =>
    act(async () => {
      root.render(
        <QueryClientProvider client={client}>{child}</QueryClientProvider>,
      );
      await flush();
    });

  it("reports a post once under StrictMode and renders the actual mutation result", async () => {
    const pending = deferred();
    postRequest.mockReturnValue(pending.promise);
    await render(
      <StrictMode>
        <PostViewTracker id="post-1" initialViews={7} />
      </StrictMode>,
    );
    await render(
      <StrictMode>
        <PostViewTracker id="post-1" initialViews={7} />
      </StrictMode>,
    );
    expect(postRequest).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("7 次浏览");
    await act(async () => {
      pending.resolve({ views: 8 });
      await flush();
    });
    expect(container.textContent).toBe("8 次浏览");
  });

  it("keeps the page fallback after an actual rejected mutation", async () => {
    pageRequest.mockRejectedValue(new Error("Synthetic network failure"));
    await render(<PageViewTracker id="page-1" initialViews={3} />);
    await act(flush);
    expect(pageRequest).toHaveBeenCalledTimes(1);
    expect(client.getMutationCache().getAll()[0]?.state.status).toBe("error");
    expect(container.textContent).toBe("3 次浏览");
    expect(postRequest).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)(
    "does not let an old post %s overwrite the newer entity",
    async (settlement) => {
      const first = deferred();
      const second = deferred();
      postRequest.mockImplementation(({ id }) =>
        id === "first" ? first.promise : second.promise,
      );
      await render(<PostViewTracker id="first" initialViews={7} />);
      await render(<PostViewTracker id="second" initialViews={20} />);
      expect(container.textContent).toBe("20 次浏览");
      await act(async () => {
        second.resolve({ views: 21 });
        await flush();
      });
      expect(container.textContent).toBe("21 次浏览");
      await act(async () => {
        if (settlement === "resolve") first.resolve({ views: 8 });
        else first.reject(new Error("Late synthetic failure"));
        await flush();
      });
      expect(container.textContent).toBe("21 次浏览");
      expect(postRequest.mock.calls.map(([input]) => input.id)).toEqual([
        "first",
        "second",
      ]);
    },
  );
});
