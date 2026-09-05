import * as React from "react";
import { paginationDefaults } from "@/packages/application/pagination";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import type {
  DataTableRequestState,
  DataTablePaginationState,
  DataTableQueryParams,
  UseDataTableStateOptions,
  UseDataTableStateResult,
} from "./types";

export function normalizeFilters(
  filters: ColumnFiltersState,
): Record<string, unknown> {
  return filters.reduce<Record<string, unknown>>((params, filter) => {
    params[filter.id] = filter.value;
    return params;
  }, {});
}

export function normalizeDataTableParams(
  state: DataTableRequestState,
): DataTableQueryParams {
  const reservedFields = new Set(["page", "limit", "sortField", "sortOrder"]);
  const params: DataTableQueryParams = normalizeFilters(
    state.columnFilters.filter((filter) => !reservedFields.has(filter.id)),
  );

  if (state.pagination) {
    Object.assign(params, state.paginationState);
  }
  const [sorting] = state.sorting;
  if (sorting) {
    params.sortField = sorting.id;
    params.sortOrder = sorting.desc ? "desc" : "asc";
  }
  return params;
}

// 后台表格保持每页 20 条的展示策略，独立于 API 缺省查询量。
const tablePaginationDefaults = { page: paginationDefaults.page, limit: 20 };

export function useDataTableState<TData = unknown>(
  options: UseDataTableStateOptions<TData>,
): UseDataTableStateResult {
  const { pagination, onChange, onSelectionChange } = options;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [paginationState, setPaginationState] =
    React.useState<DataTablePaginationState>(tablePaginationDefaults);
  const onChangeRef = React.useRef(onChange);
  const onSelectionChangeRef = React.useRef(onSelectionChange);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const requestParams = React.useMemo(
    () =>
      normalizeDataTableParams({
        pagination,
        paginationState,
        sorting,
        columnFilters,
      }),
    [columnFilters, pagination, paginationState, sorting],
  );

  React.useEffect(() => {
    onChangeRef.current?.(requestParams);
  }, [requestParams]);

  React.useEffect(() => {
    onSelectionChangeRef.current?.([]);
  }, [columnFilters, paginationState, sorting]);

  const handleSortingChange = React.useCallback(
    (updaterOrValue: React.SetStateAction<SortingState>) => {
      setSorting(updaterOrValue);
      if (pagination) {
        setPaginationState((previous) => ({
          ...previous,
          page: tablePaginationDefaults.page,
        }));
      }
    },
    [pagination],
  );

  const handleColumnFiltersChange = React.useCallback(
    (updaterOrValue: React.SetStateAction<ColumnFiltersState>) => {
      setColumnFilters(updaterOrValue);
      if (pagination) {
        setPaginationState((previous) => ({
          ...previous,
          page: tablePaginationDefaults.page,
        }));
      }
    },
    [pagination],
  );

  const handleRetry = React.useCallback(() => {
    onChangeRef.current?.(requestParams);
  }, [requestParams]);

  return {
    sorting,
    columnFilters,
    columnVisibility,
    paginationState,
    requestParams,
    handleRetry,
    handlePaginationChange: setPaginationState,
    handleSortingChange,
    handleColumnFiltersChange,
    setColumnVisibility,
  };
}
