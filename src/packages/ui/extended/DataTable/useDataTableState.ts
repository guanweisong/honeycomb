import * as React from "react";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import type {
  DataTableRequestState,
  UseDataTableStateOptions,
  UseDataTableStateResult,
} from "./types";

export function normalizeFilters(
  filters: ColumnFiltersState,
): Record<string, unknown> {
  return filters.reduce(
    (params, filter) => {
      params[filter.id] = filter.value;
      return params;
    },
    {} as Record<string, unknown>,
  );
}

export function normalizeDataTableParams<
  TRequest extends Record<string, unknown>,
>(state: DataTableRequestState): TRequest {
  const params: Record<string, unknown> = {};

  if (state.pagination) {
    Object.assign(params, state.paginationState);
  }
  if (state.sorting.length > 0) {
    params.sortField = state.sorting[0].id;
    params.sortOrder = state.sorting[0].desc ? "desc" : "asc";
  }
  if (state.columnFilters.length > 0) {
    Object.assign(params, normalizeFilters(state.columnFilters));
  }

  return params as TRequest;
}

export function useDataTableState<
  TRequest extends Record<string, unknown>,
  TData = unknown,
>(
  options: UseDataTableStateOptions<TRequest, TData>,
): UseDataTableStateResult<TRequest> {
  const { pagination, onChange, onSelectionChange } = options;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [paginationState, setPaginationState] = React.useState({
    page: 1,
    limit: 20,
  });
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
      normalizeDataTableParams<TRequest>({
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
        setPaginationState((previous) => ({ ...previous, page: 1 }));
      }
    },
    [pagination],
  );

  const handleColumnFiltersChange = React.useCallback(
    (updaterOrValue: React.SetStateAction<ColumnFiltersState>) => {
      setColumnFilters(updaterOrValue);
      if (pagination) {
        setPaginationState((previous) => ({ ...previous, page: 1 }));
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
