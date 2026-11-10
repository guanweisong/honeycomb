import * as React from "react";
import type { CheckedState } from "radix-ui/checkbox";
import type {
  UseRowSelectionOptions,
  UseRowSelectionResult,
} from "@/components/DataTable/types";

export function selectedRowsById<TData>(
  selectableById: ReadonlyMap<string, TData>,
  selectedIds: readonly string[],
): TData[] {
  return [...new Set(selectedIds)].flatMap((id) => {
    const row = selectableById.get(id);
    return row === undefined ? [] : [row];
  });
}

export function useRowSelection<TData>(
  options: UseRowSelectionOptions<TData>,
): UseRowSelectionResult<TData> {
  const {
    rows,
    isFetching,
    getRowId,
    selectedRows,
    selectedRowIds,
    onSelectedRowIdsChange,
    disabledRowSelectable,
    onSelectionChange,
  } = options;
  const selectableRows = React.useMemo(
    () => rows.filter((row) => !disabledRowSelectable?.(row)),
    [disabledRowSelectable, rows],
  );
  const selectableById = React.useMemo(
    () => new Map(selectableRows.map((row) => [getRowId(row), row])),
    [getRowId, selectableRows],
  );
  // 选择仅属于当前页；刷新时保留业务身份，但使用最新记录（包括版本）。
  const currentSelectedRows = React.useMemo(
    () =>
      selectedRowsById(
        selectableById,
        selectedRowIds ?? selectedRows.map(getRowId),
      ),
    [getRowId, selectableById, selectedRowIds, selectedRows],
  );
  const selectedIds = React.useMemo(
    () => new Set(currentSelectedRows.map(getRowId)),
    [currentSelectedRows, getRowId],
  );

  React.useEffect(() => {
    if (selectedRowIds !== undefined) {
      if (selectedIds.size !== selectedRowIds.length) {
        onSelectedRowIdsChange?.([...selectedIds]);
      }
    } else if (
      currentSelectedRows.length !== selectedRows.length ||
      currentSelectedRows.some((row, index) => row !== selectedRows[index])
    ) {
      onSelectionChange?.(currentSelectedRows);
    }
  }, [
    currentSelectedRows,
    onSelectedRowIdsChange,
    onSelectionChange,
    selectedIds,
    selectedRowIds,
    selectedRows,
  ]);

  const changeSelection = React.useCallback(
    (rows: TData[]) => {
      if (selectedRowIds !== undefined) {
        onSelectedRowIdsChange?.(rows.map(getRowId));
      } else {
        onSelectionChange?.(rows);
      }
    },
    [getRowId, onSelectedRowIdsChange, onSelectionChange, selectedRowIds],
  );
  const isRowSelected = React.useCallback(
    (row: TData) => selectedIds.has(getRowId(row)),
    [getRowId, selectedIds],
  );
  const isAllSelectedOnCurrentPage =
    selectableRows.length > 0 && selectableRows.every(isRowSelected);
  const handleSelectAll = React.useCallback(
    (checked: CheckedState) => {
      if (isFetching) return;
      changeSelection(checked === true ? [...selectableById.values()] : []);
    },
    [changeSelection, isFetching, selectableById],
  );
  const handleSelectRow = React.useCallback(
    (row: TData, checked: CheckedState) => {
      if (isFetching) return;
      const id = getRowId(row);
      const current = selectableById.get(id);
      const remaining = currentSelectedRows.filter(
        (selected) => getRowId(selected) !== id,
      );
      changeSelection(
        checked === true && current !== undefined
          ? [...remaining, current]
          : remaining,
      );
    },
    [
      changeSelection,
      currentSelectedRows,
      getRowId,
      isFetching,
      selectableById,
    ],
  );

  return {
    isAllSelectedOnCurrentPage,
    isRowSelected,
    handleSelectAll,
    handleSelectRow,
  };
}
