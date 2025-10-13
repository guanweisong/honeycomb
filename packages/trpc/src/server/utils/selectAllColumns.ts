import { AnySQLiteTable } from "drizzle-orm/sqlite-core";

/**
 * 动态选择 Drizzle ORM 表的所有列。
 * 这个函数接收一个 Drizzle ORM 的表对象，并返回一个包含所有列的对象，
 * 适用于 `db.select()` 操作，以避免手动列出所有列。
 * @template T - 继承自 `AnySQLiteTable` 的 Drizzle ORM 表类型。
 * @param {T} table - 要选择所有列的 Drizzle ORM 表对象。
 * @returns {Record<keyof T["_"]["columns"], T["_"]["columns"][keyof T["_"]["columns"]]>} 一个包含表所有列的对象。
 */
export function selectAllColumns<T extends AnySQLiteTable>(table: T) {
  return Object.fromEntries(Object.entries(table._.columns)) as Record<
    keyof T["_"]["columns"],
    T["_"]["columns"][keyof T["_"]["columns"]]
  >;
}
