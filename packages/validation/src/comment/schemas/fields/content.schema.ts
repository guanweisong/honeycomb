import { z } from "zod";

export const ContentSchema = z
  .string({ required_error: "评论内容不可为空" })
  .max(2000, "评论内容最大长度不可超过2000");
