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
} from "@honeycomb/ui/components/table";
import { Button } from "@honeycomb/ui/components/button";
import { Checkbox } from "@honeycomb/ui/components/checkbox";
import { cn } from "@honeycomb/ui/lib/utils";
import { CheckedState } from "@radix-ui/react-checkbox";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { MultiSelect } from "../MultiSelect";

export function normalizeFilters(
  filters: ColumnFiltersState,
): Record<string, any> {
  return filters.reduce(
    (acc, filter) => {
      acc[filter.id] = filter.value;
      return acc;
    },
    {} as Record<string, any>,
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

interface DataTableProps<TData, TRequest> {
  columns: ColumnDef<TData>[];
  data: DataSource<TData>;

  loading?: boolean;
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

export function DataTable<TData, TRequest>(
  props: DataTableProps<TData, TRequest>,
) {
  const {
    columns,
    data,
    loading,
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

  React.useEffect(() => {
    let params = { ...pagination } as any;
    if (sorting?.length) {
      params.sortField = sorting[0].id;
      params.sortOrder = sorting[0].desc ? "desc" : "asc";
    }
    if (columnFilters?.length) {
      params = { ...params, ...normalizeFilters(columnFilters) };
    }
    onChange?.(params as TRequest);
  }, [pagination, sorting, columnFilters]);

  const handlePaginationChange = (value: Pagination) => {
    setPagination(value);
  };

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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleSelectAll = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        const selectable = disabledRowSelectable
          ? data.list.filter((row) => !disabledRowSelectable(row))
          : data.list;
        onSelectionChange?.(selectable);
      } else {
        onSelectionChange?.([]);
      }
    },
    [data.list, disabledRowSelectable, onSelectionChange],
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

  const selectableRowsList = React.useMemo(
    () => data.list.filter((row) => !disabledRowSelectable?.(row)),
    [data.list, disabledRowSelectable],
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
                      checked={
                        selectableRowsList.length > 0 &&
                        selectedRows.length === selectableRowsList.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => {
                  const column = header.column;
                  // @ts-ignore
                  const filterOptions = column.columnDef.meta?.filterOptions;
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

                        {filterOptions?.length > 0 && (
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
                      onClick={
                        () => {}
                        // onChange?.({
                        //   pagination,
                        //   sorting,
                        //   filters: normalizeFilters(columnFilters),
                        // })
                      }
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
                  {loading ? "" : "暂无数据"}
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
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="text-muted-foreground text-sm">正在加载中...</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          第 {pagination.page} / {Math.ceil(data.total / pagination.limit)}{" "}
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
            disabled={pagination.page === 1 || loading}
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
              pagination.page * pagination.limit >= data.total || loading
            }
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
