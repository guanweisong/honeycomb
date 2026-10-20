import { requireDefined } from "@tests/helpers/require-defined";
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../MultiSelect", async () => {
  const { createElement } = await import("react");

  return {
    MultiSelect: ({ onChange }: { onChange?: (values: string[]) => void }) =>
      createElement(
        "button",
        {
          type: "button",
          "data-testid": "role-filter",
          onClick: () => onChange?.(["admin"]),
        },
        "筛选角色",
      ),
  };
});

import { DataTable } from "./index";

type Person = {
  id: string;
  name: string;
  role: string;
  locked?: boolean;
};

type PersonRequest = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  role?: string[];
};

const people: Person[] = [
  { id: "locked", name: "Alice", role: "admin", locked: true },
  { id: "active", name: "Bob", role: "member" },
];

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "name",
    header: "姓名",
    enableSorting: true,
  },
  {
    accessorKey: "role",
    header: "角色",
    meta: {
      filterOptions: [
        { label: "管理员", value: "admin" },
        { label: "成员", value: "member" },
      ],
    },
  },
];

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === label,
  );
}

describe("DataTable", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders static and table-aware toolbar content without changing its behavior", async () => {
    await act(async () =>
      root.render(
        React.createElement(DataTable<Person>, {
          columns,
          data: { list: people, total: people.length },
          pagination: false,
          toolBar: React.createElement("button", { type: "button" }, "添加"),
        }),
      ),
    );
    expect(findButton(container, "添加")).toBeDefined();
    await act(async () =>
      root.render(
        React.createElement(DataTable<Person>, {
          columns,
          data: { list: people, total: people.length },
          pagination: false,
          toolBar: (table) =>
            React.createElement(
              "span",
              { "data-testid": "row-count" },
              table.getRowModel().rows.length,
            ),
        }),
      ),
    );
    expect(
      container.querySelector('[data-testid="row-count"]')?.textContent,
    ).toBe("2");
  });

  it("emits pagination, sorting, and filter request parameters and resets selection", async () => {
    const onChange = vi.fn<(params: PersonRequest) => void>();
    const onSelectionChange = vi.fn<(rows: Person[]) => void>();

    await act(async () => {
      root.render(
        React.createElement(DataTable<Person>, {
          columns,
          data: { list: people, total: 41 },
          selectableRows: true,
          onChange,
          onSelectionChange,
        }),
      );
    });

    expect(onChange).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    onChange.mockClear();
    onSelectionChange.mockClear();

    await act(async () => findButton(container, "下一页")?.click());

    expect(onChange).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    const nameHeader = Array.from(container.querySelectorAll("th")).find(
      (header) => header.textContent?.includes("姓名"),
    );
    await act(async () => {
      nameHeader?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      sortField: "name",
      sortOrder: "asc",
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="role-filter"]')
        ?.click();
    });

    expect(onChange).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      sortField: "name",
      sortOrder: "asc",
      role: ["admin"],
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("selects and clears only selectable rows on the current page", async () => {
    const onSelectionChange = vi.fn<(rows: Person[]) => void>();

    function SelectionHarness() {
      const [selectedRows, setSelectedRows] = useState<Person[]>([]);

      return React.createElement(DataTable<Person>, {
        columns,
        data: { list: people, total: people.length },
        selectableRows: true,
        disabledRowSelectable: (row) => Boolean(row.locked),
        selectedRows,
        onSelectionChange: (rows) => {
          setSelectedRows(rows);
          onSelectionChange(rows);
        },
      });
    }

    await act(async () => root.render(React.createElement(SelectionHarness)));
    onSelectionChange.mockClear();

    let checkboxes = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="checkbox"]'),
    );
    expect(checkboxes).toHaveLength(3);
    expect(requireDefined(checkboxes[1]).disabled).toBe(true);

    await act(async () => requireDefined(checkboxes[0]).click());

    expect(onSelectionChange).toHaveBeenLastCalledWith([people[1]]);
    checkboxes = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="checkbox"]'),
    );
    expect(requireDefined(checkboxes[0]).getAttribute("data-state")).toBe(
      "checked",
    );

    await act(async () => requireDefined(checkboxes[0]).click());

    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("renders the empty state when no rows are available", async () => {
    await act(async () => {
      root.render(
        React.createElement(DataTable<Person>, {
          columns,
          data: { list: [], total: 0 },
        }),
      );
    });

    expect(container.textContent).toContain("暂无数据");
    expect(container.textContent).toContain("第 0 / 1 页， 共 0 条");
  });

  it("only offers retry when a retry action is available and not already fetching", async () => {
    const props = { columns, data: { list: [], total: 0 }, error: true };
    await act(async () =>
      root.render(React.createElement(DataTable<Person>, props)),
    );
    expect(findButton(container, "重试")).toBeUndefined();
    await act(async () =>
      root.render(
        React.createElement(DataTable<Person>, {
          ...props,
          onRetry: () => {},
          isFetching: true,
        }),
      ),
    );
    expect(requireDefined(findButton(container, "重试")).disabled).toBe(true);
  });

  it.each([true, false])(
    "refetches the failed query without changing its key (pagination: %s)",
    async (pagination) => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      const requests: PersonRequest[] = [];
      const onSelectionChange = vi.fn();

      function QueryHarness() {
        const [params, setParams] = useState<PersonRequest>(
          pagination ? { page: 1, limit: 20 } : {},
        );
        const query = useQuery({
          queryKey: ["people", params],
          queryFn: async () => {
            requests.push(params);
            if (requests.length === 1) throw new Error("Temporary failure");
            return { list: people, total: people.length };
          },
        });
        return React.createElement(DataTable<Person>, {
          columns,
          data: query.data ?? { list: [], total: 0 },
          error: query.isError,
          isFetching: query.isFetching,
          pagination,
          onChange: pagination ? setParams : undefined,
          onRetry: () => {
            void query.refetch();
          },
          onSelectionChange,
        });
      }

      await act(async () => {
        root.render(
          React.createElement(
            QueryClientProvider,
            { client },
            React.createElement(QueryHarness),
          ),
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(container.textContent).toContain("数据加载失败，请重试");
      expect(requests).toHaveLength(1);
      const key = client.getQueryCache().getAll()[0]?.queryKey;
      onSelectionChange.mockClear();

      await act(async () =>
        requireDefined(findButton(container, "重试")).click(),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(requests).toHaveLength(2);
      expect(requests[1]).toEqual(requests[0]);
      expect(client.getQueryCache().getAll()).toHaveLength(1);
      expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual(key);
      expect(container.textContent).toContain("Alice");
      expect(container.textContent).not.toContain("数据加载失败，请重试");
      expect(onSelectionChange).not.toHaveBeenCalled();
      client.clear();
    },
  );
});
