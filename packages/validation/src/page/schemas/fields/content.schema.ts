import { z } from "zod";

export const ContentSchema = z
  .string({ required_error: "文章内容不能为空" })
  .max(20000, "文章内容最大长度不可超过20000");
