import { z } from "zod";

export const TitleSchema = z
  .string()
  .min(1)
  .max(100, "文章标题最大长度不可超过100");
