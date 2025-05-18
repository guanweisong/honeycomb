import { z } from "zod";

export const SiteSignatureSchema = z
  .string()
  .max(200, "网站签名最大长度不可超过200");
