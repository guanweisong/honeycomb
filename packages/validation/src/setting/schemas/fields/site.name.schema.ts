import { z } from "zod";

export const SiteNameSchema = z
  .string()
  .min(1)
  .max(20, "网站标题最大长度不可超过20");
