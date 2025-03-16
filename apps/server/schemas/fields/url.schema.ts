import { z } from "zod";

export const UrlSchema = z.string().url().max(200, "url最大长度不可超过200");
