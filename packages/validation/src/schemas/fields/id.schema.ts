import { z } from "zod";

export const IdSchema = z
  .string({ required_error: "该字段不可为空" })
  .length(24, "id格式不合法");
