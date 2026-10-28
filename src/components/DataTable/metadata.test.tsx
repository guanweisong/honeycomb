import type { ColumnDef, ColumnMeta } from "@tanstack/react-table";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DataTable } from "@/components/DataTable";

type Row = { id: string; status: string };

// Authored metadata must be rejected at its source, not silently ignored in a render.
const invalidMetadata: ColumnMeta<Row, unknown> = {
  // @ts-expect-error Filter labels share MultiSelect's string contract.
  filterOptions: [{ label: 123, value: "draft" }],
};
void invalidMetadata;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("preserves the authored filter option contract through the real table header", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const scroll = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = () => {};
  try {
    const columns: ColumnDef<Row>[] = [
      {
        accessorKey: "status",
        header: "状态",
        meta: {
          filterOptions: [
            { label: "草稿", value: "draft" },
            { label: "已停用", value: "disabled", disabled: true },
          ],
        },
      },
    ];
    const { getByRole } = render(
      <DataTable
        columns={columns}
        getRowId={(row) => row.id}
        data={{ list: [{ id: "one", status: "draft" }], total: 1 }}
        pagination={false}
      />,
    );
    fireEvent.click(getByRole("button", { name: "筛选状态" }));
    await waitFor(() =>
      expect(
        getByRole("checkbox", { name: "已停用" }).matches(":disabled"),
      ).toBe(true),
    );
    expect(getByRole("checkbox", { name: "草稿" }).matches(":disabled")).toBe(
      false,
    );
  } finally {
    Element.prototype.scrollIntoView = scroll;
  }
});
