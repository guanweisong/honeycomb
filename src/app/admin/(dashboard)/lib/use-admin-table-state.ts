import { useCallback, useState } from "react";
import { useDataTableState } from "@/components/DataTable/useDataTableState";
import { selectedRowsById } from "@/components/DataTable/useRowSelection";

const getRowId = (row: { id: string }) => row.id;

export function useAdminTableState(pagination = true) {
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const clearSelection = useCallback(
    () => setSelectedRowIds((ids) => (ids.length ? [] : ids)),
    [],
  );
  const requestState = useDataTableState({
    pagination,
    onSelectionChange: clearSelection,
  });

  function getSelectedRows<Row extends { id: string }>(
    rows: readonly Row[] | undefined,
    disabled?: (row: Row) => boolean,
  ) {
    if (selectedRowIds.length === 0) return [];
    return selectedRowsById(
      new Map(
        rows
          ?.filter((row) => !disabled?.(row))
          .map((row) => [getRowId(row), row]),
      ),
      selectedRowIds,
    );
  }

  return {
    requestState,
    getRowId,
    selectedRowIds,
    setSelectedRowIds,
    clearSelection,
    getSelectedRows,
  };
}
