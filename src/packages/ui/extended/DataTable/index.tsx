import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/table";
import { Button } from "../../components/button";
import { Checkbox } from "../../components/checkbox";
import { cn } from "../../lib/utils";
import { CheckedState } from "@radix-ui/react-checkbox";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { MultiSelect } from "../MultiSelect";

export function normalizeFilters(
  filters: ColumnFiltersState,
): Record<string, unknown> {
  return filters.reduce(
    (acc, filter) => {
      acc[filter.id] = filter.value;
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

interface Pagination {
  page: number;
  limit: number;
}

interface DataSource<TData> {
  list: TData[];
  total: number;
}

interface DataTableProps<TData, TRequest extends Record<string, unknown>> {
  columns: ColumnDef<TData>[];
  data: DataSource<TData>;

  isFetching?: boolean;
  error?: boolean;

  selectableRows?: boolean;
  disabledRowSelectable?: (row: TData) => boolean;
  selectedRows?: TData[];
  onSelectionChange?: (selectedRows: TData[]) => void;

  rowActions?: (row: TData) => React.ReactNode;
  toolBar?: React.ReactNode;
  className?: string;

  onChange?: (params: TRequest) => void;
}

type ColumnMeta = {
  filterOptions?: Array<{ label: string; value: string }>;
};

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
    onChange,
  } = props;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    limit: 10,
  });
  const onChangeRef = React.useRef(onChange);
  const onSelectionChangeRef = React.useRef(onSelectionChange);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // 1. 合并请求：每次当分页、排序或筛选更改时，触发 onChange
  React.useEffect(() => {
    const params: Record<string, unknown> = { ...pagination };
    if (sorting?.length) {
      params.sortField = sorting[0].id;
      params.sortOrder = sorting[0].desc ? "desc" : "asc";
    }
    if (columnFilters?.length) {
      Object.assign(params, normalizeFilters(columnFilters));
    }
    onChangeRef.current?.(params as TRequest);
  }, [columnFilters, pagination, sorting]);

  // 2. 翻页、筛选、排序变化时清空已勾选项
  React.useEffect(() => {
    onSelectionChangeRef.current?.([]);
  }, [pagination, columnFilters, sorting]);

  const handlePaginationChange = (value: Pagination) => {
    setPagination(value);
  };

  // 排序改变：更新排序，并同步强制重置页码为 1
  const handleSortingChange = React.useCallback(
    (updaterOrValue: React.SetStateAction<SortingState>) => {
      setSorting(updaterOrValue);
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

  // 筛选改变：更新筛选，并同步强制重置页码为 1
  const handleColumnFiltersChange = React.useCallback(
    (updaterOrValue: React.SetStateAction<ColumnFiltersState>) => {
      setColumnFilters(updaterOrValue);
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

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
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.limit,
      },
    },
    pageCount: Math.ceil(data.total / pagination.limit),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectableRowsList = React.useMemo(
    () => data.list.filter((row) => !disabledRowSelectable?.(row)),
    [data.list, disabledRowSelectable],
  );

  const isAllSelectedOnCurrentPage = React.useMemo(() => {
    if (selectableRowsList.length === 0) return false;
    return selectableRowsList.every((row) => selectedRows.includes(row));
  }, [selectableRowsList, selectedRows]);

  const handleSelectAll = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        onSelectionChange?.(selectableRowsList);
      } else {
        onSelectionChange?.([]);
      }
    },
    [selectableRowsList, onSelectionChange],
  );

  const handleSelectRow = React.useCallback(
    (row: TData, checked: CheckedState) => {
      const newSelectedRows = checked
        ? [...selectedRows, row]
        : selectedRows.filter((r) => r !== row);
      onSelectionChange?.(newSelectedRows);
    },
    [selectedRows, onSelectionChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {toolBar}
      <div className="relative rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {selectableRows && (
                  <TableHead>
                    <Checkbox
                      checked={isAllSelectedOnCurrentPage}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => {
                  const column = header.column;
                  const filterOptions = (column.columnDef.meta as
                    | ColumnMeta
                    | undefined)?.filterOptions;
                  const isSorted = column.getIsSorted();
                  const isFiltered = (column.getFilterValue() as string[])
                    ?.length;

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={() => {
                        if (column.getCanSort()) {
                          column.toggleSorting();
                        }
                      }}
                      className={cn(
                        column.getCanSort() && "cursor-pointer select-none",
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(
                          column.columnDef.header,
                          header.getContext(),
                        )}

                        {column.getCanSort() &&
                          ({
                            asc: <ArrowUp size={16} />,
                            desc: <ArrowDown size={16} />,
                          }[isSorted as string] ?? (
                            <ArrowUpDown
                              size={16}
                              className="text-muted-foreground"
                            />
                          ))}

                        {filterOptions && filterOptions.length > 0 && (
                          <MultiSelect
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-4 w-4 p-0",
                                  isFiltered
                                    ? "text-blue-600"
                                    : "text-muted-foreground",
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Filter size={14} />
                              </Button>
                            }
                            options={filterOptions}
                            value={(column.getFilterValue() as string[]) ?? []}
                            onChange={(val) => {
                              column.setFilterValue(val || []);
                            }}
                          />
                        )}
                      </div>
                    </TableHead>
                  );
                })}
                {rowActions && <TableHead>操作</TableHead>}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="relative">
            {error ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length +
                    (selectableRows ? 1 : 0) +
                    (rowActions ? 1 : 0)
                  }
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div>数据加载失败，请重试</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const params: Record<string, unknown> = { ...pagination };
                        if (sorting?.length) {
                          params.sortField = sorting[0].id;
                          params.sortOrder = sorting[0].desc ? "desc" : "asc";
                        }
                        if (columnFilters?.length) {
                          Object.assign(params, normalizeFilters(columnFilters));
                        }
                        onChangeRef.current?.(params as TRequest);
                      }}
                    >
                      重试
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length +
                    (selectableRows ? 1 : 0) +
                    (rowActions ? 1 : 0)
                  }
                  className="h-24 text-center text-muted-foreground"
                >
                  {isFetching ? "" : "暂无数据"}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {selectableRows && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(row.original)}
                        onCheckedChange={(checked) =>
                          handleSelectRow(row.original, checked)
                        }
                        disabled={disabledRowSelectable?.(row.original)}
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>{rowActions(row.original)}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {isFetching && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="text-muted-foreground text-sm">正在加载中...</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          第 {data.total === 0 ? 0 : pagination.page} / {Math.max(1, Math.ceil(data.total / pagination.limit))}{" "}
          页，共 {data.total} 条
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handlePaginationChange({
                ...pagination,
                page: pagination.page - 1,
              })
            }
            disabled={pagination.page === 1 || isFetching}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handlePaginationChange({
                ...pagination,
                page: pagination.page + 1,
              })
            }
            disabled={
              pagination.page * pagination.limit >= data.total || isFetching
            }
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
