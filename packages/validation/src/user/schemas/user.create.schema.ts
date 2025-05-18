import { z } from "zod";
import { NameSchema } from "./fields/name.schema";
import { EmailSchema } from "./fields/email.schema";
import { StatusSchema } from "./fields/status.schema";
import { LevelSchema } from "./fields/level.schema";
import { PasswordSchema } from "./fields/password.schema";

export const UserCreateSchema = z.object({
  name: NameSchema.min(1, "用户名不能为空"),
  email: EmailSchema.min(1, "邮箱不能为空"),
  status: StatusSchema.optional(),
  level: LevelSchema.optional(),
  password: PasswordSchema,
});
