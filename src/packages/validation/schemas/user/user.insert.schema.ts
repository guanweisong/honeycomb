import * as schema from "@/packages/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { requiredString } from "@/packages/validation/utils/required.string.schema";
import { CleanZod } from "@/packages/validation/utils/clean.zod";

/**
 * 新增用户时的数据验证 schema。
 * 该 schema 基于数据库 'user' 表的插入操作 schema 生成 (drizzle-zod)。
 * 使用 `.pick()` 方法精确指定了创建新用户时允许传入的字段。
 */
export const UserInsertSchema = createInsertSchema(schema.user)
  .pick({
    name: true,
    email: true,
    status: true,
    level: true,
    password: true,
  })
  .extend({
    name: requiredString("用户名不能为空"),
    email: requiredString("用户邮箱不能为空"),
    password: requiredString("登陆密码不能为空"),
  });

export type UserInsert = CleanZod<typeof UserInsertSchema>;
