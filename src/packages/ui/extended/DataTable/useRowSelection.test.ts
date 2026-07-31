import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRowSelection } from "./useRowSelection";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { id: string; disabled?: boolean };

const rows: Row[] = [
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
    const button = container.querySelector<HTMLButtonElement>("button")!;

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

    await act(async () => buttons[0].click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([rows[1], rows[2]]);

    await act(async () => buttons[1].click());
    expect(onSelectionChange).toHaveBeenLastCalledWith([rows[2]]);
  });
});
