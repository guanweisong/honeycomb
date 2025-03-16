import { z } from "zod";

export const SiteSubNameSchema = z
  .string()
  .max(200, "网站副标题最大长度不可超过200");
