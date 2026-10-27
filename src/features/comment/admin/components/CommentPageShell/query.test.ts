import type { DataTableProps } from "@/components/DataTable";
import type { z } from "zod";
import type { CommentListQuerySchema } from "@/features/comment/schemas/comment.list-query.schema";
type CommentListQueryInput = z.input<typeof CommentListQuerySchema>;
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  queryInputs: [] as unknown[],
  refetch: vi.fn(),
  options: [] as unknown[],
  table: undefined as DataTableProps<unknown> | undefined,
  submit: undefined as ((input: CommentListQueryInput) => void) | undefined,
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    comment: {
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      destroy: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      index: {
        useQuery: (input: unknown, options: unknown) => {
          trpcMocks.options.push(options);
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
  DynamicForm: (props: {
    onSubmit: (input: CommentListQueryInput) => void;
  }) => {
    trpcMocks.submit = props.onSubmit;
    return null;
  },
}));
import { CommentPageShell } from "./index";
import { adminListQueryOptions } from "@/components/admin/config/query-options";

describe("comment query parameters", () => {
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

  it("updates and clears the search filter without a competing pagination owner", async () => {
    await act(async () => {
      root.render(React.createElement(CommentPageShell));
    });
    expect(trpcMocks.queryInputs.at(-1)).toEqual({
      page: 1,
      limit: 20,
      sortField: "updatedAt",
      sortOrder: "desc",
    });

    await act(async () => {
      trpcMocks.submit?.({
        content: "needs review",
        status: ["TO_AUDIT"],
        page: 2,
        limit: 20,
      });
    });

    expect(trpcMocks.queryInputs.at(-1)).toEqual({
      page: 1,
      limit: 20,
      sortField: "updatedAt",
      sortOrder: "desc",
      content: "needs review",
    });
    await act(async () => {
      trpcMocks.submit?.({ content: "approved" });
    });
    expect(trpcMocks.queryInputs.at(-1)).toEqual({
      page: 1,
      limit: 20,
      sortField: "updatedAt",
      sortOrder: "desc",
      content: "approved",
    });

    await act(async () => {
      trpcMocks.submit?.({});
    });

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
