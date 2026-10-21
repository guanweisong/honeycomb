import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import type { CheckedState } from "radix-ui/checkbox";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../../lib/ui/utils";
import { MultiSelect } from "../MultiSelect";
import { DataTableColumnMetaSchema } from "./types";

interface DataTableHeaderProps<TData> {
  table: TanStackTable<TData>;
  selectableRows: boolean;
  isFetching?: boolean;
  isAllSelectedOnCurrentPage: boolean;
  onSelectAll: (checked: CheckedState) => void;
  hasRowActions: boolean;
}

export function DataTableHeader<TData>(props: DataTableHeaderProps<TData>) {
  const {
    table,
    selectableRows,
    isFetching,
    isAllSelectedOnCurrentPage,
    onSelectAll,
    hasRowActions,
  } = props;

  return (
    <TableHeader className="[&_tr]:border-b">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {selectableRows && (
            <TableHead>
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
            const metadata = DataTableColumnMetaSchema.safeParse(
              column.columnDef.meta,
            );
            const filterOptions = metadata.success
              ? metadata.data.filterOptions
              : undefined;
            const isSorted = column.getIsSorted();
            const rawFilterValue: unknown = column.getFilterValue();
            const filterValue = Array.isArray(rawFilterValue)
              ? rawFilterValue.filter(
                  (value): value is string => typeof value === "string",
                )
              : [];
            const isFiltered = filterValue.length;

            return (
              <TableHead
                key={header.id}
                colSpan={header.colSpan}
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
          {hasRowActions && <TableHead>操作</TableHead>}
        </TableRow>
      ))}
    </TableHeader>
  );
}
