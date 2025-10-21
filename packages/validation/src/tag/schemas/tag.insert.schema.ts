import * as schema from "@honeycomb/db/schema";
import { createInsertSchema } from "drizzle-zod";

/**
 * 新增标签时的数据验证 schema。
 * 该 schema 基于数据库 'tag' 表的插入操作 schema 生成 (drizzle-zod)。
 * 使用 `.pick()` 方法精确指定了创建新标签时只允许传入 'name' 字段。
 */
export const TagInsertSchema = createInsertSchema(schema.tag).pick({
  name: true,
});
