import { z } from "zod";

export const SiteRecordNoSchema = z
  .string()
  .max(20, "备案号最大长度不可超过20");
