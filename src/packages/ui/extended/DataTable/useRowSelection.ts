import * as React from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { UseRowSelectionOptions, UseRowSelectionResult } from "./types";

export function useRowSelection<TData>(
  options: UseRowSelectionOptions<TData>,
): UseRowSelectionResult<TData> {
  const { rows, selectedRows, disabledRowSelectable, onSelectionChange } =
    options;
  const selectableRows = React.useMemo(
    () => rows.filter((row) => !disabledRowSelectable?.(row)),
    [disabledRowSelectable, rows],
  );
  const isAllSelectedOnCurrentPage = React.useMemo(
    () =>
      selectableRows.length > 0 &&
      selectableRows.every((row) => selectedRows.includes(row)),
    [selectableRows, selectedRows],
  );
  const handleSelectAll = React.useCallback(
    (checked: CheckedState) => {
      onSelectionChange?.(checked === true ? selectableRows : []);
    },
    [onSelectionChange, selectableRows],
  );
  const handleSelectRow = React.useCallback(
    (row: TData, checked: CheckedState) => {
      const nextSelectedRows =
        checked === true
          ? [...selectedRows, row]
          : selectedRows.filter((selectedRow) => selectedRow !== row);
      onSelectionChange?.(nextSelectedRows);
    },
    [onSelectionChange, selectedRows],
  );

  return {
    isAllSelectedOnCurrentPage,
    handleSelectAll,
    handleSelectRow,
  };
}
