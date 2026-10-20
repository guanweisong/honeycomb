import type * as React from "react";
import { z } from "zod";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
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

export const DataTableColumnMetaSchema = z.object({
  filterOptions: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
});

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
  columnVisibility: VisibilityState;
  paginationState: DataTablePaginationState;
  requestParams: DataTableQueryParams;
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
