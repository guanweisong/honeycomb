import { z } from "zod";

export const TagNameSchema = z
  .string({ required_error: "标签名称不可为空" })
  .max(100, "标签名称最大长度不可超过100");
