import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  queryInputs: [] as unknown[],
  refetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    comment: {
      index: {
        useQuery: (input: unknown) => {
          trpcMocks.queryInputs.push(input);
          return {
            data: undefined,
            isFetching: false,
            isError: false,
            refetch: trpcMocks.refetch,
          };
        },
      },
    },
  },
}));

import {
  normalizeCommentQueryParams,
  useCommentQuery,
} from "./commentQuery";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function CommentQueryHarness({
  onReady,
}: {
  onReady: (query: ReturnType<typeof useCommentQuery>) => void;
}) {
  onReady(useCommentQuery());
  return null;
}

describe("comment query parameters", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    trpcMocks.queryInputs.length = 0;
    trpcMocks.refetch.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("preserves the submitted filters and pagination input", () => {
    expect(
      normalizeCommentQueryParams({
        content: "needs review",
        status: ["TO_AUDIT"],
        page: 2,
        limit: 20,
      }),
    ).toEqual({
      content: "needs review",
      status: ["TO_AUDIT"],
      page: 2,
      limit: 20,
    });
  });

  it("sends submitted filters and pagination to the real query hook on state updates", async () => {
    let query: ReturnType<typeof useCommentQuery> | undefined;

    await act(async () => {
      root.render(
        React.createElement(CommentQueryHarness, {
          onReady: (value) => (query = value),
        }),
      );
    });
    expect(trpcMocks.queryInputs).toEqual([{}]);

    await act(async () => {
      query?.setSearchParams({
        content: "needs review",
        status: ["TO_AUDIT"],
        page: 2,
        limit: 20,
      });
    });

    expect(trpcMocks.queryInputs).toEqual([
      {},
      {
        content: "needs review",
        status: ["TO_AUDIT"],
        page: 2,
        limit: 20,
      },
    ]);
  });
});
