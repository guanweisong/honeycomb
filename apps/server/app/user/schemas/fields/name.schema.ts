import { z } from "zod";

export const NameSchema = z
  .string({ required_error: "用户名不能为空" })
  .min(1, "用户名不能为空")
  .max(20, "用户名最大长度不可超过20");
