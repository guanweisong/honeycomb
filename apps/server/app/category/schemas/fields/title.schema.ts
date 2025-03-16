import { z } from "zod";

export const TitleSchema = z
  .string()
  .min(1)
  .max(20, "分类名称最大长度不可超过20");
