import { z } from "zod";

export const PasswordSchema = z
  .string({ required_error: "密码不能为空" })
  .min(6, "密码不能少于6位");
