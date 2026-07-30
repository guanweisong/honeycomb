import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  queryInputs: [] as unknown[],
  refetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    link: {
      adminIndex: {
        useQuery: (input: unknown) => {
          trpcMocks.queryInputs.push(input);
          return {
            data: { list: [], total: 0 },
            isFetching: false,
            isError: true,
            refetch: trpcMocks.refetch,
          };
        },
      },
    },
  },
}));

import { useLinkQuery } from "./linkQuery";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function LinkQueryHarness({
  onReady,
}: {
  onReady: (query: ReturnType<typeof useLinkQuery>) => void;
}) {
  onReady(useLinkQuery());
  return null;
}

describe("link query state", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    trpcMocks.queryInputs.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("sends replacement params and forwards query status", async () => {
    let query: ReturnType<typeof useLinkQuery> | undefined;

    await act(async () => {
      root.render(
        React.createElement(LinkQueryHarness, {
          onReady: (value) => (query = value),
        }),
      );
    });

    expect(query?.data).toEqual({ list: [], total: 0 });
    expect(query?.isFetching).toBe(false);
    expect(query?.isError).toBe(true);
    expect(query?.refetch).toBe(trpcMocks.refetch);

    await act(async () => query?.setSearchParams({ page: 3, name: "OpenAI" }));

    expect(trpcMocks.queryInputs).toEqual([{}, { page: 3, name: "OpenAI" }]);
  });
});
