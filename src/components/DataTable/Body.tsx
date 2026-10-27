import type * as React from "react";
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import type { CheckedState } from "radix-ui/checkbox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface DataTableBodyProps<TData> {
  table: TanStackTable<TData>;
  getRowLabel?: (row: TData) => string;
  columnCount: number;
  error?: boolean;
  isFetching?: boolean;
  selectableRows: boolean;
  isRowSelected: (row: TData) => boolean;
  disabledRowSelectable?: (row: TData) => boolean;
  onSelectRow: (row: TData, checked: CheckedState) => void;
  rowActions?: (row: TData) => React.ReactNode;
  onRetry?: () => void;
}

export function DataTableBody<TData>(props: DataTableBodyProps<TData>) {
  const {
    table,
    getRowLabel,
    columnCount,
    error,
    isFetching,
    selectableRows,
    isRowSelected,
    disabledRowSelectable,
    onSelectRow,
    rowActions,
    onRetry,
  } = props;
  const colSpan = columnCount + (selectableRows ? 1 : 0) + (rowActions ? 1 : 0);

  return (
    <TableBody className="relative">
      {error ? (
        <TableRow>
          <TableCell
            colSpan={colSpan}
            className="h-24 text-center text-muted-foreground"
          >
            <div className="flex flex-col items-center gap-2">
              <div>数据加载失败，请重试</div>
              {onRetry && (
                <Button size="sm" onClick={onRetry} disabled={isFetching}>
                  重试
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ) : table.getRowModel().rows.length === 0 ? (
        <TableRow>
          <TableCell
            colSpan={colSpan}
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
                  aria-label={`选择记录 ${getRowLabel?.(row.original) ?? row.id}`}
                  checked={isRowSelected(row.original)}
                  onCheckedChange={(checked) =>
                    onSelectRow(row.original, checked)
                  }
                  disabled={isFetching || disabledRowSelectable?.(row.original)}
                />
              </TableCell>
            )}
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
            {rowActions && <TableCell>{rowActions(row.original)}</TableCell>}
          </TableRow>
        ))
      )}
    </TableBody>
  );
}
