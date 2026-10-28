import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import type { CheckedState } from "radix-ui/checkbox";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "cn";
import { MultiSelect } from "@/components/MultiSelect";
import type { PinnedColumnOffsets } from "@/components/DataTable/usePinnedColumnOffsets";

interface DataTableHeaderProps<TData> {
  table: TanStackTable<TData>;
  selectableRows: boolean;
  isFetching?: boolean;
  isAllSelectedOnCurrentPage: boolean;
  onSelectAll: (checked: CheckedState) => void;
  hasRowActions: boolean;
  pinnedColumnOffsets: PinnedColumnOffsets;
}

export function DataTableHeader<TData>(props: DataTableHeaderProps<TData>) {
  const {
    table,
    selectableRows,
    isFetching,
    isAllSelectedOnCurrentPage,
    onSelectAll,
    hasRowActions,
    pinnedColumnOffsets,
  } = props;
  const selectionStyle = pinnedColumnOffsets.getSelectionStyle("header");
  const actionStyle = pinnedColumnOffsets.getActionStyle("header");

  return (
    <TableHeader className="[&_tr]:border-b">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {selectableRows && (
            <TableHead
              ref={
                selectionStyle
                  ? (element) =>
                      pinnedColumnOffsets.registerSelectionHeader(element)
                  : undefined
              }
              style={selectionStyle}
              className={cn(
                selectionStyle && "bg-background",
                "[&:has([role=checkbox])]:pr-2",
              )}
            >
              <Checkbox
                aria-label="选择当前页全部可选行"
                disabled={isFetching}
                checked={isAllSelectedOnCurrentPage}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
          )}
          {headerGroup.headers.map((header) => {
            const column = header.column;
            const filterOptions = column.columnDef.meta?.filterOptions;
            const isSorted = column.getIsSorted();
            const rawFilterValue: unknown = column.getFilterValue();
            const filterValue = Array.isArray(rawFilterValue)
              ? rawFilterValue.filter(
                  (value): value is string => typeof value === "string",
                )
              : [];
            const isFiltered = filterValue.length;
            const stickyStyle = pinnedColumnOffsets.getColumnStyle(
              column.id,
              "header",
            );
            return (
              <TableHead
                key={header.id}
                ref={
                  stickyStyle
                    ? (element) =>
                        pinnedColumnOffsets.registerColumnHeader(
                          column.id,
                          element,
                        )
                    : undefined
                }
                colSpan={header.colSpan}
                style={stickyStyle}
                className={cn(stickyStyle && "bg-background")}
                aria-sort={
                  column.getCanSort()
                    ? isSorted === "asc"
                      ? "ascending"
                      : isSorted === "desc"
                        ? "descending"
                        : "none"
                    : undefined
                }
              >
                <div className="flex items-center gap-1">
                  {column.getCanSort() ? (
                    <button
                      type="button"
                      disabled={isFetching}
                      onClick={() => column.toggleSorting()}
                      className="inline-flex items-center gap-1 cursor-pointer select-none disabled:cursor-default"
                    >
                      {flexRender(column.columnDef.header, header.getContext())}
                      {isSorted === "asc" ? (
                        <ArrowUp size={16} aria-hidden />
                      ) : isSorted === "desc" ? (
                        <ArrowDown size={16} aria-hidden />
                      ) : (
                        <ArrowUpDown
                          size={16}
                          aria-hidden
                          className="text-muted-foreground"
                        />
                      )}
                    </button>
                  ) : (
                    flexRender(column.columnDef.header, header.getContext())
                  )}
                  {filterOptions && filterOptions.length > 0 && (
                    <MultiSelect
                      trigger={
                        <Button
                          type="button"
                          disabled={isFetching}
                          aria-label={`筛选${typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}`}
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-4 w-4 p-0",
                            isFiltered
                              ? "text-blue-600"
                              : "text-muted-foreground",
                          )}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Filter size={14} aria-hidden />
                        </Button>
                      }
                      options={filterOptions}
                      value={filterValue}
                      onChange={(value) => {
                        if (!isFetching) column.setFilterValue(value || []);
                      }}
                    />
                  )}
                </div>
              </TableHead>
            );
          })}
          {hasRowActions && (
            <TableHead
              ref={
                hasRowActions
                  ? (element) =>
                      pinnedColumnOffsets.registerActionHeader(element)
                  : undefined
              }
              style={actionStyle}
              className={cn(actionStyle && "bg-background")}
            >
              操作
            </TableHead>
          )}
        </TableRow>
      ))}
    </TableHeader>
  );
}
