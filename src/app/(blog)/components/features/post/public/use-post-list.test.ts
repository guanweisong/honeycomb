import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import { requireDefined } from "@tests/helpers/require-defined";

const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpcClient: { post: { index: { query: transport.request } } },
}));

import usePostList from "@/app/(blog)/components/features/post/public/use-post-list";

const page = (ids: string[], total: number, more = false) => ({
  list: ids.map((id) => createPostFixture({ id })),
  total,
  nextCursor: more ? { id: ids.at(-1) ?? "", createdAt: null } : null,
});

describe("public post-list pagination", () => {
  let root: Root;
  let client: QueryClient;
  let query: ReturnType<typeof usePostList> | undefined;

  beforeEach(() => {
    transport.request.mockReset();
    notifyManager.setScheduler(queueMicrotask);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(document.createElement("div"));
    query = undefined;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  });

  async function render(ids: string[], total: number, more = false) {
    const queryParams = { limit: 10 };
    client.setQueryData(["posts", queryParams], {
      pages: [page(ids, total, more)],
      pageParams: [null],
    });
    function Probe() {
      query = usePostList(queryParams);
      return React.createElement(
        "output",
        null,
        `${query.hasNextPage}:${query.data?.pages.length}`,
      );
    }
    await act(async () =>
      root.render(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(Probe),
        ),
      ),
    );
  }

  it("hydrates newer server data into an existing stable list query", async () => {
    const queryParams = { limit: 10 };
    const queryKey = ["posts", queryParams];
    client.setQueryData(
      queryKey,
      { pages: [page(["old"], 1)], pageParams: [null] },
      { updatedAt: Date.now() - 1_000 },
    );
    const serverClient = new QueryClient();
    serverClient.setQueryData(
      queryKey,
      { pages: [page(["new"], 1)], pageParams: [null] },
      { updatedAt: Date.now() },
    );

    function Probe() {
      query = usePostList(queryParams);
      return React.createElement("output", null, query.data?.pages[0]?.list[0]?.id);
    }

    await act(async () =>
      root.render(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(
            HydrationBoundary,
            { state: dehydrate(serverClient) },
            React.createElement(Probe),
          ),
        ),
      ),
    );

    expect(requireDefined(query).data?.pages[0]?.list[0]?.id).toBe("new");
    expect(transport.request).not.toHaveBeenCalled();
    serverClient.clear();
  });

  it("stops after an empty initial page even if its total is stale", async () => {
    await render([], 5);
    expect(requireDefined(query).hasNextPage).toBe(false);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("stops after an empty later page while preserving already loaded posts", async () => {
    await render(["first"], 5, true);
    transport.request.mockResolvedValueOnce(page([], 5));
    await act(async () => {
      await requireDefined(query).fetchNextPage();
    });
    expect(requireDefined(query).hasNextPage).toBe(false);
    expect(
      requireDefined(query).data?.pages.flatMap((value) =>
        value.list.map((item) => item.id),
      ),
    ).toEqual(["first"]);
  });

  it("follows cursor boundaries independently of a changing total", async () => {
    await render(["first"], 3, true);
    expect(requireDefined(query).hasNextPage).toBe(true);
    transport.request.mockResolvedValueOnce(page(["second"], 1, true));
    await act(async () => {
      await requireDefined(query).fetchNextPage();
    });
    expect(requireDefined(query).hasNextPage).toBe(true);
    transport.request.mockResolvedValueOnce(page(["third"], 9));
    await act(async () => {
      await requireDefined(query).fetchNextPage();
    });
    expect(requireDefined(query).hasNextPage).toBe(false);
    expect(transport.request.mock.calls.map(([input]) => input.cursor)).toEqual(
      [
        { id: "first", createdAt: null },
        { id: "second", createdAt: null },
      ],
    );
  });
});
