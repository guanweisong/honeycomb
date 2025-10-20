import { user } from "@honeycomb/db/schema";
import { createInsertSchema } from "drizzle-zod";

/**
 * 新增用户时的数据验证 schema。
 * 该 schema 基于数据库 'user' 表的插入操作 schema 生成 (drizzle-zod)。
 * 使用 `.pick()` 方法精确指定了创建新用户时允许传入的字段。
 */
export const UserInsertSchema = createInsertSchema(user).pick({
  name: true,
  email: true,
  status: true,
  level: true,
  password: true,
});
