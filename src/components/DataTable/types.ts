import type * as React from "react";
import type {
  ColumnDef,
  RowData,
  ColumnFiltersState,
  SortingState,
  Table,
} from "@tanstack/react-table";
import type { MultiSelectOption } from "@/components/MultiSelect";
import type { CheckedState } from "radix-ui/checkbox";

import type { PaginationInput } from "@/lib/validation/pagination";
export type DataTablePaginationState = Required<
  Pick<PaginationInput, "page" | "limit">
>;

export interface DataTableDataSource<TData> {
  list: TData[];
  total: number;
}

export interface DataTableQueryParams extends PaginationInput {
  [filter: string]: unknown;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  /** 稳定业务标识，用于行渲染及刷新后的选择对齐。 */
  getRowId: (row: TData) => string;
  /** 用于行选择控件的可读名称；未提供时使用稳定业务 ID。 */
  getRowLabel?: (row: TData) => string;
  data: DataTableDataSource<TData>;
  isFetching?: boolean;
  error?: boolean;
  onRetry?: () => void;
  selectableRows?: boolean;
  disabledRowSelectable?: (row: TData) => boolean;
  selectedRows?: TData[];
  onSelectionChange?: (selectedRows: TData[]) => void;
  rowActions?: (row: TData) => React.ReactNode;
  toolBar?: React.ReactNode | ((table: Table<TData>) => React.ReactNode);
  className?: string;
  maxHeightRem?: number;
  stickyHeader?: boolean;
  onChange?: (params: DataTableQueryParams) => void;
  pagination?: boolean;
}

declare module "@tanstack/react-table" {
  // TanStack's extension point requires the original generic parameters.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterOptions?: MultiSelectOption[];
  }
}

export interface DataTableRequestState {
  pagination: boolean;
  paginationState: DataTablePaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

export interface UseDataTableStateOptions<TData> {
  pagination: boolean;
  onChange?: (params: DataTableQueryParams) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

export interface UseDataTableStateResult {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  paginationState: DataTablePaginationState;
  requestParams: DataTableQueryParams;
  handlePaginationChange: (value: DataTablePaginationState) => void;
  handleSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  handleColumnFiltersChange: React.Dispatch<
    React.SetStateAction<ColumnFiltersState>
  >;
}

export interface UseRowSelectionOptions<TData> {
  rows: TData[];
  isFetching?: boolean;
  getRowId: (row: TData) => string;
  selectedRows: TData[];
  disabledRowSelectable?: (row: TData) => boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

export interface UseRowSelectionResult<TData> {
  isAllSelectedOnCurrentPage: boolean;
  isRowSelected: (row: TData) => boolean;
  handleSelectAll: (checked: CheckedState) => void;
  handleSelectRow: (row: TData, checked: CheckedState) => void;
}
