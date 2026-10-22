import { z } from "zod";
import { requiredString } from "@/lib/validation/validation";

/**
 * 后台登录表单校验 schema。
 * 仅描述用户名密码登录所需字段，避免复用后台用户新增 schema。
 */
export const LoginSchema = z.object({
  name: requiredString("用户名不能为空"),
  password: z
    .string({ message: "登录密码不能为空" })
    .min(1, "登录密码不能为空"),
});
