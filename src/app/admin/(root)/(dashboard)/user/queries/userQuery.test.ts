import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserLevel } from "@/packages/domain/identity/user";

const trpcMocks = vi.hoisted(() => ({
  queryInputs: [] as unknown[],
  refetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    user: {
      index: {
        useQuery: (input: unknown) => {
          trpcMocks.queryInputs.push(input);
          return {
            data: { list: [], total: 0 },
            isFetching: true,
            isError: false,
            refetch: trpcMocks.refetch,
          };
        },
      },
    },
  },
}));

import { useUserQuery } from "./userQuery";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function UserQueryHarness({
  onReady,
}: {
  onReady: (query: ReturnType<typeof useUserQuery>) => void;
}) {
  onReady(useUserQuery());
  return null;
}

describe("user query state", () => {
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

  it("sends the exact replacement params and forwards query status", async () => {
    let query: ReturnType<typeof useUserQuery> | undefined;

    await act(async () => {
      root.render(
        React.createElement(UserQueryHarness, {
          onReady: (value) => (query = value),
        }),
      );
    });

    expect(query?.data).toEqual({ list: [], total: 0 });
    expect(query?.isFetching).toBe(true);
    expect(query?.isError).toBe(false);
    expect(query?.refetch).toBe(trpcMocks.refetch);

    await act(async () => {
      query?.setSearchParams({
        page: 2,
        limit: 25,
        name: "alice",
        level: [UserLevel.EDITOR],
      });
    });

    await act(async () => {
      query?.setSearchParams({ name: "bob" });
    });

    await act(async () => {
      query?.setSearchParams({});
    });

    expect(trpcMocks.queryInputs).toEqual([
      {},
      {
        page: 2,
        limit: 25,
        name: "alice",
        level: [UserLevel.EDITOR],
      },
      { name: "bob" },
      {},
    ]);
  });
});
