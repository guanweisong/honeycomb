import { z } from "zod";

export const MultiLangSchema = <T>(type: z.ZodType<T, any, any>) =>
  z.object({
    zh: type,
    en: type,
  });
