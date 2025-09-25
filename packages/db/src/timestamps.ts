import { text } from "drizzle-orm/sqlite-core";

/**
 * 创建 createdAt 时间戳字段
 */
export const createdAt = (name = "created_at") =>
  text(name)
    .notNull()
    .$defaultFn(() => new Date().toISOString());

/**
 * 创建 updatedAt 时间戳字段
 */
export const updatedAt = (name = "updated_at") =>
  text(name)
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdate(() => new Date().toISOString());

/**
 * 为表添加标准时间戳字段
 */
export function withTimestamps() {
  return {
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  };
}
