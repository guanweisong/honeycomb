import type * as React from "react";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { CheckedState } from "@radix-ui/react-checkbox";

export interface DataTablePaginationState {
  page: number;
  limit: number;
}

export interface DataTableDataSource<TData> {
  list: TData[];
  total: number;
}

export interface DataTableProps<
  TData,
  TRequest extends Record<string, unknown>,
> {
  columns: ColumnDef<TData>[];
  data: DataTableDataSource<TData>;
  isFetching?: boolean;
  error?: boolean;
  selectableRows?: boolean;
  disabledRowSelectable?: (row: TData) => boolean;
  selectedRows?: TData[];
  onSelectionChange?: (selectedRows: TData[]) => void;
  rowActions?: (row: TData) => React.ReactNode;
  toolBar?: React.ReactNode;
  className?: string;
  maxHeightRem?: number;
  stickyHeader?: boolean;
  onChange?: (params: TRequest) => void;
  pagination?: boolean;
}

export interface DataTableColumnMeta {
  filterOptions?: Array<{ label: string; value: string }>;
}

export interface DataTableRequestState {
  pagination: boolean;
  paginationState: DataTablePaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

export interface UseDataTableStateOptions<
  TRequest extends Record<string, unknown>,
  TData,
> {
  pagination: boolean;
  onChange?: (params: TRequest) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

export interface UseDataTableStateResult<
  TRequest extends Record<string, unknown>,
> {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  paginationState: DataTablePaginationState;
  requestParams: TRequest;
  handleRetry: () => void;
  handlePaginationChange: (value: DataTablePaginationState) => void;
  handleSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  handleColumnFiltersChange: React.Dispatch<
    React.SetStateAction<ColumnFiltersState>
  >;
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
}

export interface UseRowSelectionOptions<TData> {
  rows: TData[];
  selectedRows: TData[];
  disabledRowSelectable?: (row: TData) => boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

export interface UseRowSelectionResult<TData> {
  isAllSelectedOnCurrentPage: boolean;
  handleSelectAll: (checked: CheckedState) => void;
  handleSelectRow: (row: TData, checked: CheckedState) => void;
}
