import { createUpdateSchema } from "drizzle-zod";
import { page } from "@honeycomb/db/src/schema";

/**
 * 更新独立页面时的数据验证 schema。
 * 1. 使用 `createUpdateSchema` 创建基础 schema，其中字段默认为可选。
 * 2. 使用 `.pick()` 方法指定了允许更新的字段以及用于识别记录的 'id'。
 * 3. 使用 `.required({ id: true })` 强制要求 'id' 字段必须存在，以确保能定位到要更新的页面。
 */
export const PageUpdateSchema = createUpdateSchema(page)
  .pick({
    title: true,
    description: true,
    content: true,
    id: true,
  })
  .required({
    id: true,
  });
