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

  async function render(
    ids: string[],
    total: number,
    snapshot?: string,
    more = false,
  ) {
    function Probe() {
      query = usePostList({ limit: 10 }, page(ids, total, more), snapshot);
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

  it("prefers a changed RSC snapshot over previously cached data for the same filters", async () => {
    await render(["old"], 1, "old-snapshot");
    await render(["new"], 1, "new-snapshot");
    expect(
      requireDefined(query).data?.pages[0]?.list.map(({ id }) => id),
    ).toEqual(["new"]);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("uses a new RSC revision when a previously seen first page recurs", async () => {
    await render(["original"], 1, "first");
    await act(async () => {
      client.setQueryData(["posts", { limit: 10 }, "first"], {
        pages: [page(["changed"], 1)],
        pageParams: [null],
      });
    });
    expect(requireDefined(query).data?.pages[0]?.list[0]?.id).toBe("changed");

    await render(["original"], 1, "later");
    expect(requireDefined(query).data?.pages[0]?.list[0]?.id).toBe("original");
  });

  it("stops after an empty initial page even if its total is stale", async () => {
    await render([], 5);
    expect(requireDefined(query).hasNextPage).toBe(false);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("stops after an empty later page while preserving already loaded posts", async () => {
    await render(["first"], 5, undefined, true);
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
    await render(["first"], 3, undefined, true);
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
