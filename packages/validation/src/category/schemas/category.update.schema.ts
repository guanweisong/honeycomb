import { createUpdateSchema } from "drizzle-zod";
import { category } from "@honeycomb/db/schema";

/**
 * 更新分类时的数据验证 schema。
 * 该 schema 基于数据库 'category' 表的更新操作 schema 生成 (drizzle-zod)，
 * 在此模式下，所有字段默认都是可选的。
 * 1. 使用 `.pick()` 方法指定了允许更新的字段以及用于识别记录的 'id'。
 * 2. 使用 `.required({ id: true })` 强制要求 'id' 字段必须存在，以确保能定位到要更新的分类。
 */
export const CategoryUpdateSchema = createUpdateSchema(category)
  .pick({
    title: true,
    description: true,
    parent: true,
    status: true,
    path: true,
    id: true,
  })
  .required({
    id: true,
  });
