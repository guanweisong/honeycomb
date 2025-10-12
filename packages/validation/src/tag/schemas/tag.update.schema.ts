import { tag } from "@honeycomb/db/src/schema";
import { createUpdateSchema } from "drizzle-zod";

/**
 * 更新标签时的数据验证 schema。
 * 1. 使用 `createUpdateSchema` 创建基础 schema，其中字段默认为可选。
 * 2. 使用 `.pick()` 方法限定操作只涉及 'id' 和 'name' 两个字段。
 * 3. 使用 `.required()` 强制要求 'id' 和 'name' 在请求中都必须提供，
 *    以确保能定位到要更新的标签并明确其新的名称。
 */
export const TagUpdateSchema = createUpdateSchema(tag)
  .pick({
    id: true,
    name: true,
  })
  .required({
    id: true,
    name: true,
  });
