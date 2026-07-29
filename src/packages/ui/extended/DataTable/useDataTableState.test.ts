import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeDataTableParams,
  normalizeFilters,
  useDataTableState,
} from "./useDataTableState";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type RequestParams = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  status?: string[];
};

describe("DataTable state", () => {
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

  it("normalizes filters and request state without pagination when disabled", () => {
    const columnFilters = [{ id: "status", value: ["published"] }];

    expect(normalizeFilters(columnFilters)).toEqual({
      status: ["published"],
    });
    expect(
      normalizeDataTableParams<RequestParams>({
        pagination: false,
        paginationState: { page: 3, limit: 20 },
        sorting: [{ id: "createdAt", desc: true }],
        columnFilters,
      }),
    ).toEqual({
      sortField: "createdAt",
      sortOrder: "desc",
      status: ["published"],
    });
  });

  it("emits normalized state and resets page and selection after changes", async () => {
    const onChange = vi.fn<(params: RequestParams) => void>();
    const onSelectionChange = vi.fn<(rows: unknown[]) => void>();

    function StateHarness() {
      const state = useDataTableState<RequestParams>({
        pagination: true,
        onChange,
        onSelectionChange,
      });

      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => state.handlePaginationChange({ page: 3, limit: 20 }),
          },
          "page",
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () =>
              state.handleSortingChange([{ id: "createdAt", desc: true }]),
          },
          "sort",
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () =>
              state.handleColumnFiltersChange([
                { id: "status", value: ["published"] },
              ]),
          },
          "filter",
        ),
      );
    }

    await act(async () => root.render(React.createElement(StateHarness)));
    expect(onChange).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    onChange.mockClear();
    onSelectionChange.mockClear();

    await act(async () => container.querySelectorAll("button")[0].click());
    expect(onChange).toHaveBeenLastCalledWith({ page: 3, limit: 20 });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    await act(async () => container.querySelectorAll("button")[1].click());
    expect(onChange).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      sortField: "createdAt",
      sortOrder: "desc",
    });

    await act(async () => container.querySelectorAll("button")[2].click());
    expect(onChange).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      sortField: "createdAt",
      sortOrder: "desc",
      status: ["published"],
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });
});
