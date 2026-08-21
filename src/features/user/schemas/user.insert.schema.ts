import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { z } from "zod";

/**
 * 新增用户时的数据验证 schema。
 * 该 schema 定义创建用户时允许传入的字段，不依赖数据库表结构。
 */
export const UserInsertSchema = z.object({
    name: requiredString("用户名不能为空"),
    email: requiredString("用户邮箱不能为空"),
    status: z.nativeEnum(UserStatus).optional(),
    level: z.nativeEnum(UserLevel).optional(),
    password: requiredString("登陆密码不能为空"),
  });

export type UserInsert = CleanZod<typeof UserInsertSchema>;
