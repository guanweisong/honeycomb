import { createInsertSchema } from "drizzle-zod";
import * as schema from "@honeycomb/db/schema";

/**
 * 新增独立页面时的数据验证 schema。
 * 该 schema 基于数据库 'page' 表的插入操作 schema 生成 (drizzle-zod)。
 * 使用 `.pick()` 方法精确指定了创建新页面时允许传入的字段：'title', 'content', 和 'status'。
 */
export const PageInsertSchema = createInsertSchema(schema.page).pick({
  title: true,
  content: true,
  status: true,
});
