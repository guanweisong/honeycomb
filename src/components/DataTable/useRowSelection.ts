import * as React from "react";
import type { CheckedState } from "radix-ui/checkbox";
import type { UseRowSelectionOptions, UseRowSelectionResult } from "@/components/DataTable/types";

export function useRowSelection<TData>(
  options: UseRowSelectionOptions<TData>,
): UseRowSelectionResult<TData> {
  const {
    rows,
    isFetching,
    getRowId,
    selectedRows,
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
  const currentSelectedRows = React.useMemo(() => {
    const seen = new Set<string>();
    return selectedRows.flatMap((row) => {
      const id = getRowId(row);
      const current = selectableById.get(id);
      if (current === undefined || seen.has(id)) return [];
      seen.add(id);
      return [current];
    });
  }, [getRowId, selectableById, selectedRows]);

  React.useEffect(() => {
    if (
      currentSelectedRows.length !== selectedRows.length ||
      currentSelectedRows.some((row, index) => row !== selectedRows[index])
    ) {
      onSelectionChange?.(currentSelectedRows);
    }
  }, [currentSelectedRows, onSelectionChange, selectedRows]);

  const selectedIds = React.useMemo(
    () => new Set(currentSelectedRows.map(getRowId)),
    [currentSelectedRows, getRowId],
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
      onSelectionChange?.(checked === true ? [...selectableById.values()] : []);
    },
    [isFetching, onSelectionChange, selectableById],
  );
  const handleSelectRow = React.useCallback(
    (row: TData, checked: CheckedState) => {
      if (isFetching) return;
      const id = getRowId(row);
      const current = selectableById.get(id);
      const remaining = currentSelectedRows.filter(
        (selected) => getRowId(selected) !== id,
      );
      onSelectionChange?.(
        checked === true && current !== undefined
          ? [...remaining, current]
          : remaining,
      );
    },
    [
      currentSelectedRows,
      getRowId,
      isFetching,
      onSelectionChange,
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
