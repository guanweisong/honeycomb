import { NameSchema } from "@/app/user/schemas/fields/name.schema";
import { PasswordSchema } from "@/app/user/schemas/fields/password.schema";
import { CaptchaSchema } from "@/schemas/captcha.schema";

export const LoginSchema = CaptchaSchema.extend({
  name: NameSchema.min(1, "用户名不可为空"),
  password: PasswordSchema.min(1, "密码不可为空"),
});
