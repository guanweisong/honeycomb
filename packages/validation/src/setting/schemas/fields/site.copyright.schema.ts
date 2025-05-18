import { z } from "zod";

export const SiteCopyrightSchema = z
  .string()
  .max(200, "版权信息最大长度不可超过200");
