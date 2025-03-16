import { z } from "zod";
import { NameSchema } from "@/app/user/schemas/fields/name.schema";
import { EmailSchema } from "@/app/user/schemas/fields/email.schema";
import { StatusSchema } from "@/app/user/schemas/fields/status.schema";
import { LevelSchema } from "@/app/user/schemas/fields/level.schema";
import { PasswordSchema } from "@/app/user/schemas/fields/password.schema";

export const UserCreateSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  status: StatusSchema.optional(),
  level: LevelSchema.optional(),
  password: PasswordSchema,
});
