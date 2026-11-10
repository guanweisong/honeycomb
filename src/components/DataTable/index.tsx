import { useEffect } from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";

import { Table } from "@/components/ui/table";
import { cn } from "cn";
import { DataTableBody } from "@/components/DataTable/Body";
import { DataTableHeader } from "@/components/DataTable/Header";
import { DataTablePagination } from "@/components/DataTable/Pagination";
import { PinnedColumnShadow } from "@/components/DataTable/PinnedColumnShadow";
import { useDataTableState } from "@/components/DataTable/useDataTableState";
import { usePinnedColumnOffsets } from "@/components/DataTable/usePinnedColumnOffsets";
import { useRowSelection } from "@/components/DataTable/useRowSelection";
import LoadingState from "@/components/LoadingState";
import type {
  DataTableProps,
  UseDataTableStateResult,
} from "@/components/DataTable/types";

export type { DataTableProps } from "@/components/DataTable/types";

export function DataTable<TData>(props: DataTableProps<TData>) {
  return props.requestState ? (
    <DataTableContent {...props} requestState={props.requestState} />
  ) : (
    <UncontrolledDataTable {...props} />
  );
}

function UncontrolledDataTable<TData>(props: DataTableProps<TData>) {
  const requestState = useDataTableState<TData>({
    pagination: props.pagination ?? true,
    onChange: props.onChange,
    onSelectionChange:
      props.selectedRowIds === undefined
        ? props.onSelectionChange
        : () => props.onSelectedRowIdsChange?.([]),
  });

  return <DataTableContent {...props} requestState={requestState} />;
}

function DataTableContent<TData>(
  props: DataTableProps<TData> & { requestState: UseDataTableStateResult },
) {
  const {
    columns,
    getRowId,
    getRowLabel,
    data,
    isFetching,
    error,
    onRetry,
    selectableRows = false,
    disabledRowSelectable,
    onSelectionChange,
    selectedRows = [],
    selectedRowIds,
    onSelectedRowIdsChange,
    rowActions,
    toolBar,
    className,
    maxHeightRem = 15,
    stickyHeader = true,
    requestState,
  } = props;

  const {
    pagination,
    sorting,
    columnFilters,
    paginationState,
    handlePaginationChange,
    handleSortingChange,
    handleColumnFiltersChange,
  } = requestState;

  const lastPage = Math.max(1, Math.ceil(data.total / paginationState.limit));
  useEffect(() => {
    if (
      pagination &&
      !isFetching &&
      !error &&
      paginationState.page > lastPage
    ) {
      handlePaginationChange({ ...paginationState, page: lastPage });
    }
  }, [
    pagination,
    isFetching,
    error,
    paginationState,
    lastPage,
    handlePaginationChange,
  ]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table 使用可变辅助对象，此处仅隔离 React Compiler 抑制范围。
  const table = useReactTable({
    data: data.list,
    columns,
    getRowId,
    defaultColumn: {
      enableSorting: false,
    },
    state: {
      sorting,
      columnFilters,
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
    getCoreRowModel: getCoreRowModel(),
  });

  const pinnedColumnOffsets = usePinnedColumnOffsets({
    table,
    selectableRows,
    hasRowActions: Boolean(rowActions),
  });

  const {
    isAllSelectedOnCurrentPage,
    isRowSelected,
    handleSelectAll,
    handleSelectRow,
  } = useRowSelection({
    rows: data.list,
    isFetching,
    getRowId,
    selectedRows,
    selectedRowIds,
    onSelectedRowIdsChange,
    disabledRowSelectable,
    onSelectionChange,
  });

  const tableWrapperClassName = cn(
    "relative flex min-h-0 flex-col overflow-hidden rounded-md border",
    stickyHeader && "overflow-hidden",
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      {typeof toolBar === "function" ? toolBar(table) : toolBar}
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
            isFetching={isFetching}
            selectableRows={selectableRows}
            isAllSelectedOnCurrentPage={isAllSelectedOnCurrentPage}
            onSelectAll={handleSelectAll}
            hasRowActions={Boolean(rowActions)}
            pinnedColumnOffsets={pinnedColumnOffsets}
          />
          <DataTableBody
            getRowLabel={getRowLabel}
            table={table}
            columnCount={columns.length}
            error={error}
            isFetching={isFetching}
            selectableRows={selectableRows}
            isRowSelected={isRowSelected}
            disabledRowSelectable={disabledRowSelectable}
            onSelectRow={handleSelectRow}
            rowActions={rowActions}
            onRetry={onRetry}
            pinnedColumnOffsets={pinnedColumnOffsets}
          />
        </Table>
        {pinnedColumnOffsets.shadowOverlays.map((overlay) => (
          <PinnedColumnShadow
            key={overlay.edge}
            edge={overlay.edge}
            style={overlay.style}
          />
        ))}
        {isFetching && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center z-10">
            <LoadingState
              variant="inline"
              label="正在加载中..."
              visuallyHiddenLabel
            />
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
