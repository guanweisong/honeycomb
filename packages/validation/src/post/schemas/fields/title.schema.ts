import { z } from "zod";

export const TitleSchema = z
  .string({ required_error: "文章标题不可为空" })
  .max(100, "文章标题最大长度不可超过100");
