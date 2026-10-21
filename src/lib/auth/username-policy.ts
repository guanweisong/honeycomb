import { z } from "zod";

export const USERNAME_MIN_LENGTH = 1;
export const USERNAME_MAX_LENGTH = 32;

/** 后台名称作为登录标识，去除两端空白但保留大小写。 */
export const LoginUsernameSchema = z
  .string({ message: "用户名不能为空" })
  .trim()
  .min(USERNAME_MIN_LENGTH, "用户名不能为空")
  .max(USERNAME_MAX_LENGTH, `用户名不能超过 ${USERNAME_MAX_LENGTH} 个字符`);
