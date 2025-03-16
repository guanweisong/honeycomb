import { z } from "zod";

export const DescriptionSchema = z
  .string()
  .max(200, "链接描述最大长度不可超过200");
