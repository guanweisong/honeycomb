import { z } from "zod";

export const ContentSchema = z
  .string()
  .min(1)
  .max(20000, "文章内容最大长度不可超过20000");
