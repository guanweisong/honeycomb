import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
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

  it("emits pagination, sorting, and filter request parameters and resets selection", async () => {
    const onChange = vi.fn<(params: PersonRequest) => void>();
    const onSelectionChange = vi.fn<(rows: Person[]) => void>();

    await act(async () => {
      root.render(
        React.createElement(DataTable<Person, PersonRequest>, {
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

      return React.createElement(DataTable<Person, PersonRequest>, {
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
    expect(checkboxes[1].disabled).toBe(true);

    await act(async () => checkboxes[0].click());

    expect(onSelectionChange).toHaveBeenLastCalledWith([people[1]]);
    checkboxes = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="checkbox"]'),
    );
    expect(checkboxes[0].getAttribute("data-state")).toBe("checked");

    await act(async () => checkboxes[0].click());

    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("renders the empty state when no rows are available", async () => {
    await act(async () => {
      root.render(
        React.createElement(DataTable<Person, PersonRequest>, {
          columns,
          data: { list: [], total: 0 },
        }),
      );
    });

    expect(container.textContent).toContain("暂无数据");
    expect(container.textContent).toContain("第 0 / 1 页， 共 0 条");
  });

  it("renders the error state and retries with the current request", async () => {
    const onChange = vi.fn<(params: PersonRequest) => void>();

    await act(async () => {
      root.render(
        React.createElement(DataTable<Person, PersonRequest>, {
          columns,
          data: { list: [], total: 0 },
          error: true,
          onChange,
        }),
      );
    });

    expect(container.textContent).toContain("数据加载失败，请重试");
    expect(container.textContent).not.toContain("暂无数据");
    onChange.mockClear();

    await act(async () => findButton(container, "重试")?.click());

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });
});
