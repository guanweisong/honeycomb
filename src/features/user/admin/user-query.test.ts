import type { DataTableProps } from "@/components/DataTable";
import type { UserListQueryInput } from "@/features/user/schema";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserLevel } from "@/features/user/user";

const trpcMocks = vi.hoisted(() => ({
  queryInputs: [] as unknown[],
  refetch: vi.fn(),
  options: [] as unknown[],
  table: undefined as DataTableProps<unknown> | undefined,
  submit: undefined as ((input: UserListQueryInput) => void) | undefined,
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    user: {
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      destroy: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      index: {
        useQuery: (input: unknown, options: unknown) => {
          trpcMocks.options.push(options);
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

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => false,
}));
vi.mock("@/components/DataTable", () => ({
  DataTable: (props: DataTableProps<unknown>) => {
    trpcMocks.table = props;
    return props.toolBar;
  },
}));
vi.mock("@/components/DynamicForm", () => ({
  DynamicForm: (props: { onSubmit: (input: UserListQueryInput) => void }) => {
    trpcMocks.submit = props.onSubmit;
    return null;
  },
}));
vi.mock("./components/UserFormDialog", () => ({ UserFormDialog: () => null }));
import { UserPageShell } from "./components/UserPageShell";
import { adminListQueryOptions } from "@/components/admin/query-options";

describe("user query state", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    trpcMocks.queryInputs.length = 0;
    trpcMocks.options.length = 0;
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
    await act(async () => {
      root.render(React.createElement(UserPageShell));
    });

    expect(trpcMocks.table?.data).toEqual({ list: [], total: 0 });
    expect(trpcMocks.table?.isFetching).toBe(true);
    expect(trpcMocks.table?.error).toBe(false);
    await act(async () => trpcMocks.table?.onRetry?.());
    expect(trpcMocks.refetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      trpcMocks.submit?.({
        page: 2,
        limit: 25,
        name: "alice",
        level: [UserLevel.EDITOR],
      });
    });

    await act(async () => {
      trpcMocks.submit?.({ name: "bob" });
    });

    await act(async () => {
      trpcMocks.submit?.({});
    });

    expect(
      trpcMocks.options.every((options) => options === adminListQueryOptions),
    ).toBe(true);
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
