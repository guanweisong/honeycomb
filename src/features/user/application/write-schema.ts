import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { hasUpdateFields } from "@/packages/application/validation";
import { CredentialPasswordSchema } from "@/packages/identity/auth/password-policy";
import {
  type CleanZod,
  requiredString,
} from "@/packages/application/validation";
import { z } from "zod";

/** 后台账号写入契约，不依赖数据库表结构。 */
export const UserInsertSchema = z.object({
  name: requiredString("用户名不能为空"),
  email: requiredString("用户邮箱不能为空")
    .email("用户邮箱格式不正确")
    .max(254, "用户邮箱不能超过 254 个字符"),
  status: z.nativeEnum(UserStatus).optional(),
  level: z.nativeEnum(UserLevel).optional(),
  password: CredentialPasswordSchema,
});

export type UserInsert = CleanZod<typeof UserInsertSchema>;

export const UserUpdateSchema = UserInsertSchema.partial().extend({
  id: IdSchema,
}).refine(hasUpdateFields, "至少修改一个字段");

export type UserUpdate = CleanZod<typeof UserUpdateSchema>;
