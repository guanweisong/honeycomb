import { z } from "zod";

export const ExcerptSchema = z
  .string()
  .max(1000, "文章简介最大长度不可超过1000");
