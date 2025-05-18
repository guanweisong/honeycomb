import { z } from "zod";

export const UrlSchema = z
  .string({ required_error: "链接不可为空" })
  .url("链接格式不正确")
  .max(200, "url最大长度不可超过200");
