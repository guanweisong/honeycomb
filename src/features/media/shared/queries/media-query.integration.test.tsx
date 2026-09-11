import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaViewModel } from "../media-view-model";
import type { MediaIndexInput } from "@/features/media/schemas/media.list.query.schema";

const transport = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    media: {
      index: {
        useQuery: (input: MediaIndexInput) =>
          useQuery({
            queryKey: ["media", input],
            queryFn: (): Promise<{ list: MediaViewModel[]; total: number }> =>
              transport.request(input),
            staleTime: Infinity,
            retry: false,
          }),
      },
    },
  },
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
  let container: HTMLDivElement;
  let root: Root;
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
    client = new QueryClient();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
    container.remove();
  });

  async function render() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      ),
    );
  }
  async function waitForCount(count: number) {
    await act(async () => {
      await vi.waitFor(() => expect(query.data.list).toHaveLength(count));
    });
  }
  async function waitForFetch() {
    await act(async () => {
      await vi.waitFor(() => expect(client.isFetching()).toBe(0));
    });
  }

  it("keeps media after an unchanged reconciliation preserves the cached data identity", async () => {
    transport.request.mockImplementation(async () => ({
      list: [media("one")],
      total: 1,
    }));
    await render();
    await waitForCount(1);
    const key = ["media", { page: 1, limit: 50 }];
    const cached = client.getQueryData(key);

    // Indeterminate uploads call this same reconciliation entry point.
    await act(async () => query.refetch());
    await waitForFetch();

    expect(transport.request).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(key)).toBe(cached);
    expect(query.data).toEqual({ list: [media("one")], total: 1 });
    expect(container.querySelectorAll("li")).toHaveLength(1);
    expect(query.hasMore).toBe(false);
  });

  it("preserves visible media while reconciliation is pending or fails", async () => {
    transport.request.mockResolvedValue({ list: [media("one")], total: 1 });
    await render();
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
    expect(container.querySelectorAll("li")).toHaveLength(1);
    await act(async () => fail?.(new Error("refresh failed")));
    await waitForFetch();
    expect(query.data.list).toEqual([media("one")]);
    expect(query.error).toBe("refresh failed");
  });

  it("resets later pages and explicitly refetches the already fresh first page", async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) =>
      media(`media-${index}`),
    );
    transport.request.mockImplementation(async ({ page }: MediaIndexInput) => ({
      list: page === 1 ? firstPage : [media("last")],
      total: 51,
    }));
    await render();
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
});
