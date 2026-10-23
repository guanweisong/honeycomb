import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  focusManager,
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaRecord as MediaViewModel } from "@/features/media/types/media.record";
import type { MediaIndexInput } from "@/features/media/types/media.list";

import type { trpcClient } from "@/lib/trpc/client/trpc";

type MediaPage = Awaited<ReturnType<typeof trpcClient.media.index.query>>;
const transport = vi.hoisted(() => ({
  request: vi.fn<typeof trpcClient.media.index.query>(),
  accountId: "account-a",
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpcClient: { media: { index: { query: transport.request } } },
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: transport.accountId } }),
}));

import { useMediaQuery } from "./media-query";

function media(id: string): MediaViewModel {
  return {
    id,
    key: `${id}.png`,
    name: `${id}.png`,
    size: 1024,
    type: "image/png",
    url: `https://example.test/${id}.png`,
    color: null,
    height: 100,
    width: 100,
    createdAt: null,
    updatedAt: null,
  };
}

describe("media reconciliation with React and TanStack Query", () => {
  let client: QueryClient;
  let query: ReturnType<typeof useMediaQuery>;

  function Harness() {
    query = useMediaQuery();
    return (
      <ul>
        {query.data.list.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    );
  }

  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    transport.request.mockReset();
    transport.accountId = "account-a";
    client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });
  afterEach(() => {
    cleanup();
    client.clear();
    focusManager.setFocused(undefined);
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  });

  function renderMedia() {
    return render(
      <QueryClientProvider client={client}>
        <Harness key={transport.accountId} />
      </QueryClientProvider>,
    );
  }
  async function waitForCount(count: number) {
    await waitFor(() => expect(query.data.list).toHaveLength(count));
  }
  async function waitForFetch() {
    await waitFor(() => expect(client.isFetching()).toBe(0));
  }

  it("keeps media after an unchanged reconciliation preserves the cached data identity", async () => {
    transport.request.mockImplementation(async () => ({
      list: [media("one")],
      total: 1,
    }));
    renderMedia();
    await waitForCount(1);
    const key = ["media", "account-a", { page: 1, limit: 50 }];
    const cached = client.getQueryData(key);
    expect(cached).toBeDefined();

    // Indeterminate uploads call this same reconciliation entry point.
    await act(async () => query.refetch());
    await waitForFetch();

    expect(transport.request).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(key)).toBe(cached);
    expect(query.data).toEqual({ list: [media("one")], total: 1 });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(query.hasMore).toBe(false);
  });

  it("preserves visible media while reconciliation is pending or fails", async () => {
    transport.request.mockResolvedValue({ list: [media("one")], total: 1 });
    renderMedia();
    await waitForCount(1);
    let fail: ((reason: Error) => void) | undefined;
    transport.request.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    );

    await act(async () => query.refetch());
    expect(query.data.list).toEqual([media("one")]);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await act(async () => fail?.(new Error("refresh failed")));
    await waitForFetch();
    expect(query.data.list).toEqual([media("one")]);
    expect(query.error).toBe("refresh failed");
  });

  it("retries the failed page explicitly without discarding or skipping earlier pages", async () => {
    let failed = true;
    transport.request.mockImplementation(async ({ page }: MediaIndexInput) => {
      if (page === 2 && failed) throw new Error("second page failed");
      return { list: [media(`page-${page}`)], total: 3 };
    });
    renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    await waitForFetch();
    expect(query.error).toBe("second page failed");
    expect(query.data.list.map(({ id }) => id)).toEqual(["page-1"]);
    await act(async () => query.loadMore());
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2,
    ]);
    failed = false;
    await act(async () => query.retry());
    await waitForCount(2);
    expect(query.error).toBeUndefined();
    await act(async () => query.loadMore());
    await waitForCount(3);
    expect(query.data.list.map(({ id }) => id)).toEqual([
      "page-1",
      "page-2",
      "page-3",
    ]);
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2, 2, 3,
    ]);
  });

  it("retries an initially failed page without advancing pagination", async () => {
    transport.request
      .mockRejectedValueOnce(new Error("first page failed"))
      .mockResolvedValue({ list: [media("one")], total: 1 });
    renderMedia();
    await waitForFetch();
    expect(query.error).toBe("first page failed");
    await act(async () => query.retry());
    await waitForCount(1);
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 1,
    ]);
  });

  it("keeps only the previous rows while the next page is pending", async () => {
    let finish:
      ((value: { list: MediaViewModel[]; total: number }) => void) | undefined;
    transport.request.mockImplementation(({ page }: MediaIndexInput) =>
      page === 1
        ? Promise.resolve({ list: [media("first")], total: 2 })
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    expect(query.hasMore).toBe(false);
    expect(query.isFetchingMore).toBe(true);
    await act(async () => {
      query.loadMore();
      query.loadMore();
    });
    expect(transport.request).toHaveBeenCalledTimes(2);
    await act(async () => finish?.({ list: [media("second")], total: 2 }));
    await waitForCount(2);
    expect(query.isFetchingMore).toBe(false);
  });

  it("accepts equal-ID adjacent pages without duplicate rows or a stuck request", async () => {
    const firstPage = Array.from({ length: 50 }, (_, i) =>
      media(`overlap-${i}`),
    );
    transport.request.mockImplementation(async ({ page }: MediaIndexInput) => ({
      list: page === 3 ? [media("last")] : firstPage,
      total: 101,
    }));
    renderMedia();
    await waitForCount(50);
    await act(async () => query.loadMore());
    await waitForFetch();
    expect(query.isFetchingMore).toBe(false);
    expect(query.data.list).toHaveLength(50);
    await act(async () => query.loadMore());
    await waitForCount(51);
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2, 3,
    ]);
    // Pagination uses visible IDs, not the raw sum of overlapping page sizes.
    expect(query.hasMore).toBe(true);
  });

  it("resets later pages and explicitly refetches the already fresh first page", async () => {
    client.setDefaultOptions({
      queries: { retry: false, staleTime: Infinity },
    });
    const firstPage = Array.from({ length: 50 }, (_, index) =>
      media(`media-${index}`),
    );
    transport.request.mockImplementation(async ({ page }: MediaIndexInput) => ({
      list: page === 1 ? firstPage : [media("last")],
      total: 51,
    }));
    renderMedia();
    await waitForCount(50);
    await act(async () => query.loadMore());
    await waitForCount(51);

    await act(async () => query.reset());
    await waitForCount(50);
    await waitForFetch();

    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2, 1,
    ]);
    expect(query.data.list.some(({ id }) => id === "last")).toBe(false);
    expect(query.hasMore).toBe(true);
    await act(async () => query.loadMore());
    await waitForCount(51);
    expect(query.data.list.at(-1)?.id).toBe("last");
  });

  it("stops after an empty page even when the reported total is larger", async () => {
    transport.request.mockImplementation(async ({ page }: MediaIndexInput) => ({
      list: page === 1 ? [media("one")] : [],
      total: page === 1 ? 10 : 8,
    }));
    renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    await waitForFetch();
    expect(query.data).toEqual({ list: [media("one")], total: 8 });
    expect(query.hasMore).toBe(false);
    expect(query.isFetchingMore).toBe(false);
    await act(async () => query.loadMore());
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2,
    ]);
  });

  it("keeps only the first page when a later-page reset fails", async () => {
    transport.request.mockImplementation(async ({ page }: MediaIndexInput) => ({
      list: [media(`page-${page}`)],
      total: 3,
    }));
    renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    await waitForCount(2);
    const refresh = Promise.withResolvers<never>();
    transport.request.mockReturnValueOnce(refresh.promise);

    await act(async () => query.reset());
    expect(query.data.list.map(({ id }) => id)).toEqual(["page-1"]);
    await act(async () => refresh.reject(new Error("reset failed")));
    await waitForFetch();
    expect(query.data.list.map(({ id }) => id)).toEqual(["page-1"]);
    expect(query.error).toBe("reset failed");
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2, 1,
    ]);
  });

  it("does not let a simultaneous sentinel skip a requested first-page reset", async () => {
    transport.request.mockImplementation(async ({ page }: MediaIndexInput) => ({
      list: [media(`page-${page}`)],
      total: 3,
    }));
    renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    await waitForCount(2);
    const refresh = Promise.withResolvers<MediaPage>();
    transport.request.mockReturnValueOnce(refresh.promise);

    await act(async () => {
      query.reset();
      query.loadMore();
      query.loadMore();
    });
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2, 1,
    ]);
    expect(query.data.list.map(({ id }) => id)).toEqual(["page-1"]);
    await act(async () =>
      refresh.resolve({ list: [media("refreshed")], total: 1 }),
    );
    await waitForFetch();
    expect(query.data.list.map(({ id }) => id)).toEqual(["refreshed"]);
    expect(query.hasMore).toBe(false);
  });

  it("releases the reset lock after an unchanged first page finishes refreshing", async () => {
    const firstPage = { list: [media("first")], total: 2 };
    const refresh = Promise.withResolvers<MediaPage>();
    transport.request
      .mockResolvedValueOnce(firstPage)
      .mockReturnValueOnce(refresh.promise)
      .mockResolvedValueOnce({ list: [media("second")], total: 2 });
    renderMedia();
    await waitForCount(1);
    await act(async () => {
      query.reset();
      query.loadMore();
      query.loadMore();
    });
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 1,
    ]);
    expect(query.data.list).toEqual(firstPage.list);
    await act(async () => refresh.resolve(firstPage));
    await waitForFetch();
    await act(async () => query.loadMore());
    await waitForCount(2);
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 1, 2,
    ]);
  });

  it("releases the reset lock after an immediately resolved unchanged first page", async () => {
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
    const firstPage = { list: [media("first")], total: 2 };
    transport.request
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({ list: [media("second")], total: 2 });
    renderMedia();
    await waitForCount(1);
    await act(async () => query.reset());
    await waitForFetch();
    await act(async () => query.loadMore());
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 1, 2,
    ]);
    await waitForCount(2);
  });

  it("does not let a canceled reset release the newer reset's request lock", async () => {
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
    const firstPage = { list: [media("first")], total: 2 };
    const oldRefresh = Promise.withResolvers<MediaPage>();
    const newRefresh = Promise.withResolvers<MediaPage>();
    transport.request
      .mockResolvedValueOnce(firstPage)
      .mockReturnValueOnce(oldRefresh.promise)
      .mockReturnValueOnce(newRefresh.promise)
      .mockResolvedValueOnce({ list: [media("second")], total: 2 });
    renderMedia();
    await waitForCount(1);
    const pendingSentinel = query.loadMore;
    await act(async () => {
      query.reset();
      query.reset();
    });
    expect(transport.request.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
    expect(transport.request.mock.calls[2]?.[1]?.signal?.aborted).toBe(false);
    await act(async () => oldRefresh.resolve(firstPage));
    // The queued sentinel still has the pre-reset isFetching snapshot.
    await act(async () => pendingSentinel());
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 1, 1,
    ]);
    await act(async () => newRefresh.resolve(firstPage));
    await waitForFetch();
    await waitFor(() => expect(query.isRetrying).toBe(false));
    await act(async () => query.loadMore());
    await waitForCount(2);
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 1, 1, 2,
    ]);
  });

  it("ignores a late next-page response after resetting to the first page", async () => {
    const next = Promise.withResolvers<MediaPage>();
    transport.request
      .mockResolvedValueOnce({ list: [media("first")], total: 3 })
      .mockReturnValueOnce(next.promise)
      .mockResolvedValueOnce({ list: [media("refreshed")], total: 1 });
    renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    expect(query.isFetchingMore).toBe(true);
    const nextSignal = transport.request.mock.calls[1]?.[1]?.signal;
    expect(nextSignal).toBeInstanceOf(AbortSignal);
    expect(nextSignal?.aborted).toBe(false);
    await act(async () => query.reset());
    expect(nextSignal?.aborted).toBe(true);
    await waitFor(() => expect(query.data.list[0]?.id).toBe("refreshed"));
    await act(async () => next.resolve({ list: [media("late")], total: 3 }));
    await waitForFetch();
    expect(query.data).toEqual({ list: [media("refreshed")], total: 1 });
    expect(query.isFetchingMore).toBe(false);
  });

  it("isolates cached pages and late responses when the account changes", async () => {
    const oldNext = Promise.withResolvers<MediaPage>();
    transport.request
      .mockResolvedValueOnce({ list: [media("account-a-first")], total: 2 })
      .mockReturnValueOnce(oldNext.promise)
      .mockResolvedValueOnce({ list: [media("account-b-first")], total: 1 });
    const view = renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    const oldSignal = transport.request.mock.calls[1]?.[1]?.signal;
    expect(oldSignal).toBeInstanceOf(AbortSignal);
    expect(oldSignal?.aborted).toBe(false);
    transport.accountId = "account-b";
    view.rerender(
      <QueryClientProvider client={client}>
        <Harness key={transport.accountId} />
      </QueryClientProvider>,
    );
    expect(query.data.list).toEqual([]);
    expect(oldSignal?.aborted).toBe(true);
    expect(screen.queryByText("account-a-first.png")).toBeNull();
    await waitFor(() => expect(query.data.list[0]?.id).toBe("account-b-first"));
    await act(async () =>
      oldNext.resolve({ list: [media("account-a-late")], total: 2 }),
    );
    await waitForFetch();
    expect(query.data.list.map(({ id }) => id)).toEqual(["account-b-first"]);
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["account-b-first.png"]);
    expect(query.hasMore).toBe(false);
  });

  it("starts from the first page on remount with production cache defaults", async () => {
    transport.request.mockImplementation(async ({ page }) => ({
      list: [media(`page-${page}`)],
      total: 3,
    }));
    const view = renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    await waitForCount(2);
    await act(async () => query.loadMore());
    await waitForCount(3);

    const refresh = Promise.withResolvers<MediaPage>();
    transport.request.mockReturnValueOnce(refresh.promise);
    view.unmount();
    renderMedia();
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2, 3, 1,
    ]);
    expect(query.data.list.map(({ id }) => id)).toEqual(["page-1"]);
    await act(async () =>
      refresh.resolve({ list: [media("refreshed-1")], total: 3 }),
    );
    await waitForFetch();
    expect(query.data.list.map(({ id }) => id)).toEqual(["refreshed-1"]);
  });

  it("refreshes only the current page on focus with production cache defaults", async () => {
    focusManager.setFocused(false);
    transport.request.mockImplementation(async ({ page }) => ({
      list: [media(`page-${page}`)],
      total: 3,
    }));
    renderMedia();
    await waitForCount(1);
    await act(async () => query.loadMore());
    await waitForCount(2);
    await act(async () => query.loadMore());
    await waitForCount(3);

    transport.request.mockResolvedValueOnce({
      list: [media("refreshed-3")],
      total: 3,
    });
    await act(async () => focusManager.setFocused(true));
    await waitForFetch();
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      1, 2, 3, 3,
    ]);
    expect(query.data.list.map(({ id }) => id)).toEqual([
      "page-1",
      "page-2",
      "refreshed-3",
    ]);
  });
});
