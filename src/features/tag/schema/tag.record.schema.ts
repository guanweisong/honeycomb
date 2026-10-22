import { NullableI18nSchema } from "@/lib/i18n/i18n";
import { z } from "zod";

export const TagRecordSchema = z.object({
  id: z.string(),
  name: NullableI18nSchema,
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
