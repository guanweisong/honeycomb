import { createUpdateSchema } from "drizzle-zod";
import { link } from "@honeycomb/db/src/schema";

/**
 * 更新友情链接时的数据验证 schema。
 * 1. 使用 `createUpdateSchema` 创建基础 schema，其中字段默认为可选。
 * 2. 使用 `.pick()` 方法指定了所有允许更新的字段以及用于识别记录的 'id'。
 * 3. 使用 `.required({ id: true })` 强制要求 'id' 字段必须存在，以确保能定位到要更新的链接。
 */
export const LinkUpdateSchema = createUpdateSchema(link)
  .pick({
    url: true,
    status: true,
    name: true,
    description: true,
    logo: true,
    id: true,
  })
  .required({ id: true });
