import { z } from "zod";

export const NameSchema = z
  .string()
  .min(0)
  .max(100, "标签名称最大长度不可超过100");
