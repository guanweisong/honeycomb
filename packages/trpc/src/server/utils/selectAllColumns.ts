import { AnySQLiteTable } from "drizzle-orm/sqlite-core";

export function selectAllColumns<T extends AnySQLiteTable>(table: T) {
  return Object.fromEntries(Object.entries(table._.columns)) as Record<
    keyof T["_"]["columns"],
    T["_"]["columns"][keyof T["_"]["columns"]]
  >;
}
