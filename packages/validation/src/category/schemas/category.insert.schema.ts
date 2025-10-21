import { createInsertSchema } from "drizzle-zod";
import * as schema from "@honeycomb/db/schema";

/**
 * 新增分类时的数据验证 schema。
 * 该 schema 基于数据库 'category' 表的插入操作 schema 生成 (drizzle-zod)。
 * 使用 `.pick()` 方法精确指定了创建新分类时允许传入的字段，
 * 包括 'title', 'description', 'parent', 'status', 和 'path'。
 */
export const CategoryInsertSchema = createInsertSchema(schema.category).pick({
  title: true,
  description: true,
  parent: true,
  status: true,
  path: true,
});
