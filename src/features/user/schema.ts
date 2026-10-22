import { normalizeEmail } from "@/lib/auth/email-policy";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  QueryStringArraySchema,
  queryString,
} from "@/lib/validation/query.string.schema";
import { UserLevel, UserStatus } from "@/features/user/user";
import { IdSchema } from "@/lib/validation/id.schema";
import { hasUpdateFields } from "@/lib/validation/validation";
import { CredentialPasswordSchema } from "@/lib/auth/password-policy";
import { LoginUsernameSchema } from "@/lib/auth/username-policy";
import { requiredString } from "@/lib/validation/validation";
import { z } from "zod";

const UserEmailSchema = requiredString("用户邮箱不能为空")
  .email("用户邮箱格式不正确")
  .max(254, "用户邮箱不能超过 254 个字符");

/** 后台账号写入契约，不依赖数据库表结构。 */
export const UserInsertSchema = z.object({
  name: LoginUsernameSchema,
  email: UserEmailSchema.transform(normalizeEmail),
  status: z.nativeEnum(UserStatus).optional(),
  level: z.nativeEnum(UserLevel).optional(),
  password: CredentialPasswordSchema,
});

export const UserUpdateSchema = UserInsertSchema.partial()
  .extend({
    id: IdSchema,
    // Preserve spelling until the transaction distinguishes an edit from a full-form echo.
    email: UserEmailSchema.optional(),
  })
  .refine(hasUpdateFields, "至少修改一个字段");

/**
 * 获取用户列表时的查询参数验证 schema。
 */
export const UserListQuerySchema = PaginationQuerySchema.extend({
  status: QueryStringArraySchema,
  level: QueryStringArraySchema,
  name: queryString(),
}).partial();
