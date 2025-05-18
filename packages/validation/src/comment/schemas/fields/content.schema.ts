import { z } from "zod";

export const ContentSchema = z
  .string()
  .min(1)
  .max(2000, "评论内容最大长度不可超过2000");
