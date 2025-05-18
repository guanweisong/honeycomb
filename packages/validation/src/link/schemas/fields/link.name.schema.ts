import { z } from "zod";

export const LinkNameSchema = z
  .string({ required_error: "链接不可为空" })
  .max(20, "链接名称最大长度不可超过20");
