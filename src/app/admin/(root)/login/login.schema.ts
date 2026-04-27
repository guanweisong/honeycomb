import { z } from "zod";
import { requiredString } from "@/packages/trpc/api/schemas/required.string.schema";

/**
 * 后台登录表单校验 schema。
 * 仅描述用户名密码登录所需字段，避免复用后台用户新增 schema。
 */
export const LoginSchema = z.object({
  name: requiredString("用户名不能为空"),
  password: requiredString("登录密码不能为空"),
});

export type LoginValues = z.infer<typeof LoginSchema>;
