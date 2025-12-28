import { createInsertSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";

/**
 * 更新用户时的数据验证 schema。
 * 1. 基于用户表的插入 schema 创建。
 * 2. 使用 `.pick()` 方法指定了所有允许更新的字段以及用于识别记录的 'id'。
 * 3. 使用 `.required({ id: true })` 强制要求 'id' 字段必须存在，以确保能定位到要更新的用户。
 *    注意：其他字段在此 schema 中不是必需的，允许部分更新。
 */
export const UserUpdateSchema = createInsertSchema(schema.user)
  .pick({
    id: true,
    name: true,
    email: true,
    status: true,
    level: true,
    password: true,
  })
  .required({ id: true });
