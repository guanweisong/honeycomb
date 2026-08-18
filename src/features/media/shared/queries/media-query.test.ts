import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  data: { list: ["media-1"], total: 2 } as {
    list: string[];
    total: number;
  },
  isFetching: false,
  input: undefined as unknown,
  refetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    media: {
      index: {
        useQuery: (input: unknown) => {
          trpcMocks.input = input;
          return {
            data: trpcMocks.data,
            isFetching: trpcMocks.isFetching,
            refetch: trpcMocks.refetch,
          };
        },
      },
    },
  },
}));

import { getMediaQueryInput, useMediaQuery } from "./media-query";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("media query input", () => {
  it("starts with a bounded first page", () => {
    expect(getMediaQueryInput()).toEqual({ page: 1, limit: 50 });
  });

  describe("hook", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      trpcMocks.data = { list: ["media-1"], total: 2 };
      trpcMocks.isFetching = false;
      trpcMocks.input = undefined;
      trpcMocks.refetch.mockReset();
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    it("uses the first page and exposes bounded query state", async () => {
      let query: ReturnType<typeof useMediaQuery> | undefined;
      function Harness() {
        query = useMediaQuery();
        return null;
      }

      await act(async () => root.render(React.createElement(Harness)));
      expect(trpcMocks.input).toEqual({ page: 1, limit: 50 });
      expect(query).toEqual({
        data: { list: ["media-1"], total: 2 },
        hasMore: true,
        isFetchingMore: false,
        loadMore: expect.any(Function),
        refetch: expect.any(Function),
        reset: expect.any(Function),
      });
    });

    it("appends the next page in order", async () => {
      let query: ReturnType<typeof useMediaQuery> | undefined;
      function Harness() {
        query = useMediaQuery();
        return null;
      }

      await act(async () => root.render(React.createElement(Harness)));
      await act(async () => query?.loadMore());
      expect(trpcMocks.input).toEqual({ page: 2, limit: 50 });

      trpcMocks.data = { list: ["media-2"], total: 2 };
      await act(async () => root.render(React.createElement(Harness)));

      await vi.waitFor(() =>
        expect(query?.data).toEqual({
          list: ["media-1", "media-2"],
          total: 2,
        }),
      );
      expect(query?.hasMore).toBe(false);
    });

    it("prevents loading past the total or issuing duplicate requests", async () => {
      let query: ReturnType<typeof useMediaQuery> | undefined;
      function Harness() {
        query = useMediaQuery();
        return null;
      }

      await act(async () => root.render(React.createElement(Harness)));
      await act(async () => {
        query?.loadMore();
        query?.loadMore();
      });
      expect(trpcMocks.input).toEqual({ page: 2, limit: 50 });

      trpcMocks.data = { list: ["media-2"], total: 2 };
      await act(async () => root.render(React.createElement(Harness)));
      await act(async () => query?.loadMore());
      expect(trpcMocks.input).toEqual({ page: 2, limit: 50 });
    });
  });
});
