import { z } from "zod";
import { NameSchema } from "@/app/user/schemas/fields/name.schema";
import { EmailSchema } from "@/app/user/schemas/fields/email.schema";
import { StatusSchema } from "@/app/user/schemas/fields/status.schema";
import { LevelSchema } from "@/app/user/schemas/fields/level.schema";
import { PasswordSchema } from "@/app/user/schemas/fields/password.schema";

export const UserCreateSchema = z.object({
  name: NameSchema.min(1, "用户名不能为空"),
  email: EmailSchema.min(1, "邮箱不能为空"),
  status: StatusSchema.optional(),
  level: LevelSchema.optional(),
  password: PasswordSchema,
});
