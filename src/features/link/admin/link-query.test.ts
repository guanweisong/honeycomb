import type { DataTableProps } from "@/components/DataTable";
import type { LinkListQueryInput } from "@/features/link/types/link.list";
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
vi.mock("@/components/DataTable", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/DataTable")>();
  return {
    DataTable: (props: DataTableProps<unknown>) => {
      trpcMocks.table = props;
      return React.createElement(actual.DataTable, props);
    },
  };
});
vi.mock("@/components/DynamicForm", () => ({
  DynamicForm: (props: { onSubmit: (input: LinkListQueryInput) => void }) => {
    trpcMocks.submit = props.onSubmit;
    return null;
  },
}));
vi.mock("./components/LinkFormDialog", () => ({ LinkFormDialog: () => null }));
import { LinkPageShell } from "./components/LinkPageShell";
import { adminListQueryOptions } from "@/components/admin/config/query-options";

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

  it("updates the table search filter and forwards query status", async () => {
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

    expect(trpcMocks.queryInputs.at(-1)).toEqual({
      page: 1,
      limit: 20,
      sortField: "updatedAt",
      sortOrder: "desc",
      name: "OpenAI",
    });
    await act(async () => trpcMocks.submit?.({ name: "Example" }));
    expect(trpcMocks.queryInputs.at(-1)).toEqual({
      page: 1,
      limit: 20,
      sortField: "updatedAt",
      sortOrder: "desc",
      name: "Example",
    });

    await act(async () => trpcMocks.submit?.({}));

    expect(
      trpcMocks.options.every((options) => options === adminListQueryOptions),
    ).toBe(true);
    expect(trpcMocks.queryInputs.at(-1)).toEqual({
      page: 1,
      limit: 20,
      sortField: "updatedAt",
      sortOrder: "desc",
    });
  });
});
