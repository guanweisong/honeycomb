import { z } from "zod";

export const NameSchema = z
  .string()
  .min(1)
  .max(20, "标签名称最大长度不可超过20");
