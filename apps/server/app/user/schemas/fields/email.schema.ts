import { z } from "zod";

export const EmailSchema = z
  .string({ required_error: "邮箱不能为空" })
  .email({ message: "请填写正确的邮箱" })
  .max(20, "邮箱最大长度不可超过20");
