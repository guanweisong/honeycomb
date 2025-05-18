import { z } from "zod";

export const ContentSchema = z
  .string()
  .min(1)
  .max(200, "token最大长度不可超过200");
