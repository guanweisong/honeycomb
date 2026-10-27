import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaRecord } from "@/features/media/types/media.record";
import type { trpcClient } from "@/lib/trpc/client/trpc";

const transport = vi.hoisted(() => ({
  request: vi.fn<typeof trpcClient.media.index.query>(),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpcClient: { media: { index: { query: transport.request } } },
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: "account-a" } }),
}));

import { getMediaQueryInput, useMediaQuery } from "@/features/media/admin/media-query";

function media(id: string): MediaRecord {
  return {
    id,
    key: `${id}.png`,
    name: `${id}.png`,
    size: 1,
    type: "image/png",
    url: `/${id}.png`,
    color: null,
    height: null,
    width: null,
    createdAt: null,
    updatedAt: null,
  };
}

describe("media query input", () => {
  let client: QueryClient;
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    transport.request.mockReset();
    transport.request.mockImplementation(async ({ page }) => ({
      list: [media(`media-${page}`)],
      total: 2,
    }));
  });
  afterEach(() => {
    cleanup();
    client.clear();
  });
  function wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  }

  it("starts with a bounded first page", () => {
    expect(getMediaQueryInput()).toEqual({ page: 1, limit: 50 });
  });

  it("uses the first page and exposes bounded query state", async () => {
    const { result } = renderHook(useMediaQuery, { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(transport.request.mock.calls[0]?.[0]).toEqual({
      page: 1,
      limit: 50,
    });
    expect(result.current).toEqual({
      data: { list: [media("media-1")], total: 2 },
      error: undefined,
      hasMore: true,
      isLoading: false,
      isFetchingMore: false,
      isRetrying: false,
      retry: expect.any(Function),
      loadMore: expect.any(Function),
      refetch: expect.any(Function),
      reset: expect.any(Function),
    });
  });

  it("appends the next page in order", async () => {
    const { result } = renderHook(useMediaQuery, { wrapper });
    await waitFor(() => expect(result.current.data.list).toHaveLength(1));
    await act(async () => result.current.loadMore());
    expect(transport.request.mock.calls[1]?.[0]).toEqual({
      page: 2,
      limit: 50,
    });
    await waitFor(() =>
      expect(result.current.data).toEqual({
        list: [media("media-1"), media("media-2")],
        total: 2,
      }),
    );
    expect(result.current.hasMore).toBe(false);
  });

  it("prevents loading past the total or issuing duplicate requests", async () => {
    const { result } = renderHook(useMediaQuery, { wrapper });
    await waitFor(() => expect(result.current.data.list).toHaveLength(1));
    const next =
      Promise.withResolvers<Awaited<ReturnType<typeof transport.request>>>();
    transport.request.mockReturnValueOnce(next.promise);
    await act(async () => {
      result.current.loadMore();
      result.current.loadMore();
    });
    expect(transport.request.mock.calls.map(([input]) => input)).toEqual([
      { page: 1, limit: 50 },
      { page: 2, limit: 50 },
    ]);
    await act(async () => next.resolve({ list: [media("media-2")], total: 2 }));
    await waitFor(() => expect(result.current.data.list).toHaveLength(2));
    await act(async () => result.current.loadMore());
    expect(transport.request).toHaveBeenCalledTimes(2);
  });
});
