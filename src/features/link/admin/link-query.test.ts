import type { DataTableProps } from "@/components/DataTable";
import type { LinkListQueryInput } from "@/features/link/schema";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnableStatus } from "@/lib/validation/enable-status";

const trpcMocks = vi.hoisted(() => ({
  queryInputs: [] as unknown[],
  refetch: vi.fn(),
  options: [] as unknown[],
  table: undefined as DataTableProps<unknown> | undefined,
  submit: undefined as ((input: LinkListQueryInput) => void) | undefined,
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    link: {
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      destroy: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      adminIndex: {
        useQuery: (input: unknown, options: unknown) => {
          trpcMocks.options.push(options);
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
  DynamicForm: (props: { onSubmit: (input: LinkListQueryInput) => void }) => {
    trpcMocks.submit = props.onSubmit;
    return null;
  },
}));
vi.mock("./components/LinkFormDialog", () => ({ LinkFormDialog: () => null }));
import { LinkPageShell } from "./components/LinkPageShell";
import { adminListQueryOptions } from "@/components/admin/query-options";

describe("link query state", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    trpcMocks.queryInputs.length = 0;
    trpcMocks.options.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("sends replacement params and forwards query status", async () => {
    await act(async () => {
      root.render(React.createElement(LinkPageShell));
    });

    expect(trpcMocks.table?.data).toEqual({ list: [], total: 0 });
    expect(trpcMocks.table?.isFetching).toBe(false);
    expect(trpcMocks.table?.error).toBe(true);
    await act(async () => trpcMocks.table?.onRetry?.());
    expect(trpcMocks.refetch).toHaveBeenCalledTimes(1);

    await act(async () =>
      trpcMocks.submit?.({
        page: 3,
        limit: 25,
        name: "OpenAI",
        status: [EnableStatus.ENABLE],
      }),
    );

    await act(async () => trpcMocks.submit?.({ name: "Example" }));

    await act(async () => trpcMocks.submit?.({}));

    expect(
      trpcMocks.options.every((options) => options === adminListQueryOptions),
    ).toBe(true);
    expect(trpcMocks.queryInputs).toEqual([
      {},
      {
        page: 3,
        limit: 25,
        name: "OpenAI",
        status: ["ENABLE"],
      },
      { name: "Example" },
      {},
    ]);
  });
});
