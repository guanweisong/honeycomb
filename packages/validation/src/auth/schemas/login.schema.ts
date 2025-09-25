import { CaptchaSchema } from "@honeycomb/validation/schemas/captcha.schema";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";

export const LoginSchema = CaptchaSchema.extend({
  name: UserInsertSchema.shape.name,
  password: UserInsertSchema.shape.password,
});
