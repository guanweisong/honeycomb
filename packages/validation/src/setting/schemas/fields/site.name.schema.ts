import { z } from "zod";

export const SiteNameSchema = z
  .string({ required_error: "网站标题不可为空" })
  .min(1, "网站标题不可为空")
  .max(20, "网站标题最大长度不可超过20");
