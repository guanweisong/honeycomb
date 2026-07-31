import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

import { Table } from "../../components/table";
import { cn } from "../../lib/utils";
import { DataTableBody } from "./Body";
import { DataTableHeader } from "./Header";
import { DataTablePagination } from "./Pagination";
import { DataTableToolbar } from "./Toolbar";
import { useDataTableState } from "./useDataTableState";
import { useRowSelection } from "./useRowSelection";
import type { DataTableProps } from "./types";

export { normalizeFilters } from "./useDataTableState";
export type { DataTableProps } from "./types";

export function DataTable<TData, TRequest extends Record<string, unknown>>(
  props: DataTableProps<TData, TRequest>,
) {
  const {
    columns,
    data,
    isFetching,
    error,
    selectableRows = false,
    disabledRowSelectable,
    onSelectionChange,
    selectedRows = [],
    rowActions,
    toolBar,
    className,
    maxHeightRem = 15,
    stickyHeader = true,
    onChange,
    pagination = true,
  } = props;

  const {
    sorting,
    columnFilters,
    columnVisibility,
    paginationState,
    handlePaginationChange,
    handleSortingChange,
    handleColumnFiltersChange,
    handleRetry,
    setColumnVisibility,
  } = useDataTableState<TRequest, TData>({
    pagination,
    onChange,
    onSelectionChange,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table uses mutable helpers; isolate the React Compiler opt-out here.
  const table = useReactTable({
    data: data.list,
    columns,
    defaultColumn: {
      enableSorting: false,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: pagination
        ? {
            pageIndex: paginationState.page - 1,
            pageSize: paginationState.limit,
          }
        : undefined,
    },
    pageCount: pagination ? Math.ceil(data.total / paginationState.limit) : 1,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const { isAllSelectedOnCurrentPage, handleSelectAll, handleSelectRow } =
    useRowSelection({
      rows: data.list,
      selectedRows,
      disabledRowSelectable,
      onSelectionChange,
    });

  const tableWrapperClassName = cn(
    "relative flex min-h-0 flex-col overflow-hidden rounded-md border",
    stickyHeader && "overflow-hidden",
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <DataTableToolbar>{toolBar}</DataTableToolbar>
      <div
        className={tableWrapperClassName}
        style={
          stickyHeader
            ? { maxHeight: `calc(100dvh - ${maxHeightRem}rem)` }
            : undefined
        }
      >
        <Table
          containerClassName={
            stickyHeader ? "min-h-0 overflow-auto" : "overflow-x-auto"
          }
          className={cn(
            "w-full",
            stickyHeader &&
              "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background",
          )}
        >
          <DataTableHeader
            table={table}
            selectableRows={selectableRows}
            isAllSelectedOnCurrentPage={isAllSelectedOnCurrentPage}
            onSelectAll={handleSelectAll}
            hasRowActions={Boolean(rowActions)}
          />
          <DataTableBody
            table={table}
            columnCount={columns.length}
            error={error}
            isFetching={isFetching}
            selectableRows={selectableRows}
            selectedRows={selectedRows}
            disabledRowSelectable={disabledRowSelectable}
            onSelectRow={handleSelectRow}
            rowActions={rowActions}
            onRetry={handleRetry}
          />
        </Table>
        {isFetching && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="text-muted-foreground text-sm">正在加载中...</span>
          </div>
        )}
      </div>
      {pagination && (
        <DataTablePagination
          total={data.total}
          isFetching={isFetching}
          paginationState={paginationState}
          onPaginationChange={handlePaginationChange}
        />
      )}
    </div>
  );
}
