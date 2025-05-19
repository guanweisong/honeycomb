import { z } from "zod";

export const AuthorSchema = z
  .string({ required_error: "昵称不可为空" })
  .max(20, "评论者昵称最大长度不可超过20");
