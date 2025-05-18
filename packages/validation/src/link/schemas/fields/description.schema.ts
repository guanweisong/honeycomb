import { z } from "zod";

export const DescriptionSchema = z
  .string({ required_error: "链接描述不可为空" })
  .max(200, "链接描述最大长度不可超过200");
