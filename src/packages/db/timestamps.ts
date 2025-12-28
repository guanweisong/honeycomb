import { text } from "drizzle-orm/sqlite-core";

/**
 * 创建一个 `createdAt` 时间戳字段定义。
 *
 * @param {string} [name="created_at"] - 数据库中的字段名，默认为 "created_at"。
 * @returns 一个 Drizzle ORM 的 text 字段构建器，配置了默认值函数，
 *          该函数在插入新记录时会自动将当前时间（ISO 格式）设为字段值。
 */
export const createdAt = (name = "created_at") =>
  text(name).$defaultFn(() => new Date().toISOString());

/**
 * 创建一个 `updatedAt` 时间戳字段定义。
 *
 * @param {string} [name="updated_at"] - 数据库中的字段名，默认为 "updated_at"。
 * @returns 一个 Drizzle ORM 的 text 字段构建器，配置了默认值和更新触发器。
 *          - 插入新记录时，自动将当前时间设为字段值。
 *          - 更新记录时 (`$onUpdate`)，自动将字段值更新为当前时间。
 */
export const updatedAt = (name = "updated_at") =>
  text(name)
    .$defaultFn(() => new Date().toISOString())
    .$onUpdate(() => new Date().toISOString());

/**
 * 一个辅助函数，用于快速向表定义中添加 `createdAt` 和 `updatedAt` 字段。
 *
 * @returns {Object} 包含 `createdAt` 和 `updatedAt` 字段定义的对象，
 *                   可直接在 Drizzle 的表结构定义中展开使用。
 * @example
 * export const myTable = sqliteTable("my_table", {
 *   id: text("id").primaryKey(),
 *   ...withTimestamps(),
 * });
 */
export function withTimestamps() {
  return {
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  };
}
