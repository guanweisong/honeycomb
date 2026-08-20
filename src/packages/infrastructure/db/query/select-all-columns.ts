import { AnySQLiteTable } from "drizzle-orm/sqlite-core";
import { getTableColumns } from "drizzle-orm";

/**
 * 返回 Drizzle SQLite 表的全部列定义，避免重复维护选择字段。
 *
 * @template T - 继承自 `AnySQLiteTable` 的 Drizzle ORM 表类型。
 * @param {T} table - 要选择所有列的 Drizzle ORM 表对象。
 * @returns {Record<keyof T["_"]["columns"], T["_"]["columns"][keyof T["_"]["columns"]]>} 一个包含表所有列的对象。
 */
export function selectAllColumns<T extends AnySQLiteTable>(table: T) {
  return getTableColumns(table);
}
