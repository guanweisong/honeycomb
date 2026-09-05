import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "../../components/button";
import { Checkbox } from "../../components/checkbox";
import { TableHead, TableHeader, TableRow } from "../../components/table";
import { cn } from "../../lib/utils";
import { MultiSelect } from "../MultiSelect";
import { DataTableColumnMetaSchema } from "./types";

interface DataTableHeaderProps<TData> {
  table: TanStackTable<TData>;
  selectableRows: boolean;
  isAllSelectedOnCurrentPage: boolean;
  onSelectAll: (checked: CheckedState) => void;
  hasRowActions: boolean;
}

export function DataTableHeader<TData>(props: DataTableHeaderProps<TData>) {
  const {
    table,
    selectableRows,
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
                  {flexRender(column.columnDef.header, header.getContext())}
                  {column.getCanSort() &&
                    (isSorted === "asc" ? (
                      <ArrowUp size={16} />
                    ) : isSorted === "desc" ? (
                      <ArrowDown size={16} />
                    ) : (
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
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Filter size={14} />
                        </Button>
                      }
                      options={filterOptions}
                      value={filterValue}
                      onChange={(value) => {
                        column.setFilterValue(value || []);
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
