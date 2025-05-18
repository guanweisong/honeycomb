import { z } from "zod";

export const AuthorSchema = z
  .string()
  .min(1)
  .max(20, "评论者昵称最大长度不可超过20");
