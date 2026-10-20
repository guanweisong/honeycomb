import { requireDefined } from "@tests/helpers/require-defined";
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRowSelection } from "./useRowSelection";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { id: string; disabled?: boolean };

const rows: [Row, Row, Row] = [
  { id: "disabled", disabled: true },
  { id: "first" },
  { id: "second" },
];

describe("useRowSelection", () => {
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

  it("selects and clears selectable rows on the current page", async () => {
    const onSelectionChange = vi.fn<(selectedRows: Row[]) => void>();

    function SelectionHarness() {
      const [selectedRows, setSelectedRows] = useState<Row[]>([]);
      const selection = useRowSelection({
        rows,
        getRowId: (row: Row) => row.id,
        selectedRows,
        disabledRowSelectable: (row: Row) => Boolean(row.disabled),
        onSelectionChange: (nextRows: Row[]) => {
          setSelectedRows(nextRows);
          onSelectionChange(nextRows);
        },
      });

      return React.createElement(
        "button",
        {
          type: "button",
          "data-all-selected": selection.isAllSelectedOnCurrentPage,
          onClick: () =>
            selection.handleSelectAll(!selection.isAllSelectedOnCurrentPage),
        },
        "all",
      );
    }

    await act(async () => root.render(React.createElement(SelectionHarness)));
    const button = container.querySelector<HTMLButtonElement>("button");
    if (!button) throw new Error("selection button was not rendered");

    await act(async () => button.click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([rows[1], rows[2]]);
    expect(button.dataset.allSelected).toBe("true");

    await act(async () => button.click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(button.dataset.allSelected).toBe("false");
  });

  it("adds and removes a single row without changing the others", async () => {
    const onSelectionChange = vi.fn<(selectedRows: Row[]) => void>();

    function RowHarness() {
      const [selectedRows, setSelectedRows] = useState<Row[]>([rows[1]]);
      const selection = useRowSelection({
        rows,
        getRowId: (row: Row) => row.id,
        selectedRows,
        onSelectionChange: (nextRows: Row[]) => {
          setSelectedRows(nextRows);
          onSelectionChange(nextRows);
        },
      });

      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => selection.handleSelectRow(rows[2], true),
          },
          "add",
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => selection.handleSelectRow(rows[1], false),
          },
          "remove",
        ),
      );
    }

    await act(async () => root.render(React.createElement(RowHarness)));
    const buttons = container.querySelectorAll("button");

    await act(async () => requireDefined(buttons[0]).click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([rows[1], rows[2]]);

    await act(async () => requireDefined(buttons[1]).click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([rows[2]]);
  });

  it("reconciles refreshed, missing and newly disabled rows by ID without duplicates", async () => {
    const original: Row = { id: "first" };
    const refreshed: Row = { id: "first" };
    const onSelectionChange = vi.fn<(selectedRows: Row[]) => void>();
    function Harness({ currentRows }: { currentRows: Row[] }) {
      const [selectedRows, setSelectedRows] = useState<Row[]>([original]);
      const selection = useRowSelection({
        rows: currentRows,
        selectedRows,
        getRowId: (row: Row) => row.id,
        disabledRowSelectable: (row: Row) => Boolean(row.disabled),
        onSelectionChange: (next: Row[]) => {
          setSelectedRows(next);
          onSelectionChange(next);
        },
      });
      return React.createElement(
        "button",
        {
          "data-selected": selection.isAllSelectedOnCurrentPage,
          onClick: () => selection.handleSelectRow(refreshed, true),
        },
        "select",
      );
    }
    await act(async () =>
      root.render(React.createElement(Harness, { currentRows: [refreshed] })),
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith([refreshed]);
    expect(onSelectionChange.mock.calls.at(-1)?.[0][0]).toBe(refreshed);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    await act(async () =>
      root.render(React.createElement(Harness, { currentRows: [refreshed] })),
    );
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const button = requireDefined(container.querySelector("button"));
    expect(button.dataset.selected).toBe("true");
    await act(async () => button.click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([refreshed]);
    await act(async () =>
      root.render(
        React.createElement(Harness, {
          currentRows: [{ id: "first", disabled: true }],
        }),
      ),
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    await act(async () => button.click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    await act(async () =>
      root.render(React.createElement(Harness, { currentRows: [] })),
    );
    expect(button.dataset.selected).toBe("false");
  });
  it("ignores direct select and deselect calls while fetching without discarding selection", async () => {
    const onSelectionChange = vi.fn<(selectedRows: Row[]) => void>();
    function Harness() {
      const selection = useRowSelection({
        rows,
        getRowId: (row: Row) => row.id,
        selectedRows: [rows[1]],
        isFetching: true,
        onSelectionChange,
      });
      return React.createElement(
        "button",
        {
          "data-selected": selection.isRowSelected(rows[1]),
          onClick: () => {
            selection.handleSelectRow(rows[2], true);
            selection.handleSelectRow(rows[1], false);
            selection.handleSelectAll(true);
            selection.handleSelectAll(false);
          },
        },
        "attempt changes",
      );
    }
    await act(async () => root.render(React.createElement(Harness)));
    const button = requireDefined(container.querySelector("button"));
    await act(async () => button.click());
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(button.dataset.selected).toBe("true");
  });
});
