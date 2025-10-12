import { CaptchaSchema } from "@honeycomb/validation/schemas/captcha.schema";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";

/**
 * 用户登录数据验证 schema。
 * 该 schema 扩展了 CaptchaSchema，因此包含了验证码字段。
 * 同时，它复用了 UserInsertSchema 中的 'name' 和 'password' 字段定义。
 */
export const LoginSchema = CaptchaSchema.extend({
  name: UserInsertSchema.shape.name,
  password: UserInsertSchema.shape.password,
});
