import { z } from "zod";

export const MultiLangSchema = (type: z.ZodTypeAny) =>
  z.object({
    zh: type,
    en: type,
  });
