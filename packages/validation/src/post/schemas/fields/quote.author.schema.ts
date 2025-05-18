import { z } from "zod";

export const QuoteAuthorSchema = z
  .string()
  .max(100, "引用来源最大长度不可超过1000");
