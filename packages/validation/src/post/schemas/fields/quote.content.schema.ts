import { z } from "zod";

export const QuoteContentSchema = z
  .string()
  .max(20000, "引用内容最大长度不可超过20000");
