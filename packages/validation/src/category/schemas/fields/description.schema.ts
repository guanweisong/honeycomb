import { z } from "zod";

export const DescriptionSchema = z
  .string({ required_error: "分类描述不可为空" })
  .max(200, "描述最大长度不可超过200");
