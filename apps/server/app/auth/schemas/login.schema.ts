import { NameSchema } from "@/app/user/schemas/fields/name.schema";
import { PasswordSchema } from "@/app/user/schemas/fields/password.schema";
import { CaptchaSchema } from "@/schemas/captcha.schema";

export const LoginSchema = CaptchaSchema.extend({
  name: NameSchema,
  password: PasswordSchema,
});
