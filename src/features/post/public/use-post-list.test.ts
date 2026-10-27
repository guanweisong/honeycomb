import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
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

import usePostList from "@/features/post/public/use-post-list";

const page = (ids: string[], total: number) => ({
  list: ids.map((id) => createPostFixture({ id })),
  total,
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

  async function render(ids: string[], total: number) {
    function Probe() {
      query = usePostList({ limit: 10 }, page(ids, total));
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

  it("stops after an empty initial page even if its total is stale", async () => {
    await render([], 5);
    expect(requireDefined(query).hasNextPage).toBe(false);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("stops after an empty later page while preserving already loaded posts", async () => {
    await render(["first"], 5);
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

  it("continues after a nonempty short page until the total is reached", async () => {
    await render(["first"], 3);
    expect(requireDefined(query).hasNextPage).toBe(true);
    transport.request.mockResolvedValueOnce(page(["second"], 3));
    await act(async () => {
      await requireDefined(query).fetchNextPage();
    });
    expect(requireDefined(query).hasNextPage).toBe(true);
    transport.request.mockResolvedValueOnce(page(["third"], 3));
    await act(async () => {
      await requireDefined(query).fetchNextPage();
    });
    expect(requireDefined(query).hasNextPage).toBe(false);
    expect(transport.request.mock.calls.map(([input]) => input.page)).toEqual([
      2, 3,
    ]);
  });
});
