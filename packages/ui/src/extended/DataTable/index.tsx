import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
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
} from "@ui/components/table";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { cn } from "@ui/lib/utils";
import { useDeepCompareEffect } from "ahooks";
import { PaginationResponse } from "admin/src/types/PaginationResponse";
import { CheckedState } from "@radix-ui/react-checkbox";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { MultiSelect } from "@ui/extended/MultiSelect";

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

export interface DataTableRef {
  reload: () => void;
}

interface DataTableProps<TData, TRequest> {
  columns: ColumnDef<TData>[];

  params?: TRequest;

  request: (params: TRequest) => Promise<PaginationResponse<TData>>;

  selectableRows?: boolean;
  disabledRowSelectable?: (row: TData) => boolean;
  selectedRows?: TData[];
  onSelectionChange?: (selectedRows: TData[]) => void;

  rowActions?: (row: TData) => React.ReactNode;

  className?: string;

  toolBar?: React.ReactNode;
}

function DataTableInner<TData, TRequest>(
  props: DataTableProps<TData, TRequest>,
  ref: React.Ref<{ reload: () => void }>,
) {
  const {
    columns,
    request,
    selectableRows = false,
    disabledRowSelectable,
    onSelectionChange,
    selectedRows = [],
    params,
    rowActions,
    className,
    toolBar,
  } = props;
  const [data, setData] = React.useState<TData[]>([]);
  const [rowCount, setRowCount] = React.useState(0);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    limit: 20,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handlePaginationChange = (value: Pagination) => {
    setPagination(value);
  };

  useDeepCompareEffect(() => {
    setPagination((preState) => ({ ...preState, page: 1 }));
    setTimeout(() => {
      requestFn();
    }, 0);
  }, [params]);

  React.useImperativeHandle(ref, () => ({
    reload: requestFn,
  }));

  const requestFn = () => {
    setError(false);
    setLoading(true);
    let data: any = { ...pagination };
    if (params) {
      data = { ...data, ...params };
    }
    if (sorting?.length) {
      sorting.forEach((item) => {
        data.sortField = item.id;
        data.sortOrder = item.desc ? "desc" : "asc";
      });
    }
    if (columnFilters.length) {
      data = {
        ...data,
        ...normalizeFilters(columnFilters),
      };
    }
    request(data)
      .then((result) => {
        setData(result.data.list);
        setRowCount(result.data.total);
      })
      .catch(() => {
        setError(true);
        setData([]);
        setRowCount(0);
      })
      .finally(() => {
        onSelectionChange?.([]);
        setLoading(false);
      });
  };

  useDeepCompareEffect(() => {
    requestFn();
  }, [pagination, sorting, columnFilters]);

  const table = useReactTable({
    data,
    columns,
    defaultColumn: {
      enableSorting: false,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: { pageIndex: pagination.page, pageSize: pagination.limit },
    },
    pageCount: Math.ceil(rowCount / pagination.limit),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectable = disabledRowSelectable
        ? data.filter((row) => !disabledRowSelectable(row))
        : data;
      onSelectionChange?.(selectable);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (row: TData, checked: CheckedState) => {
    const newSelectedRows = checked
      ? [...selectedRows, row]
      : selectedRows.filter((r) => r !== row);
    onSelectionChange?.(newSelectedRows);
  };

  const selectableRowsList = data.filter(
    (row) => !disabledRowSelectable?.(row),
  );

  return (
    <div className={cn("space-y-2", className)}>
      {toolBar}
      <div className="rounded-md border overflow-hidden">
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
            {loading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                <span className="text-muted-foreground text-sm">
                  正在加载中...
                </span>
              </div>
            )}
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
                    <Button size="sm" onClick={requestFn}>
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
                  暂无数据
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
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          第 {pagination.page} / {Math.ceil(rowCount / pagination.limit)} 页，共{" "}
          {rowCount} 条
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
            disabled={pagination.page * pagination.limit >= rowCount || loading}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}

export const DataTable = React.forwardRef(DataTableInner) as <TData, TRequest>(
  props: DataTableProps<TData, TRequest> & { ref?: React.Ref<DataTableRef> },
) => ReturnType<typeof DataTableInner>;
