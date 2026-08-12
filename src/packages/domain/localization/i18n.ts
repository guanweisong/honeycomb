import { z } from "zod";

const localizedValueSchema = z.string().trim().min(1);

export const I18nSchema = z.object({
  en: localizedValueSchema,
  zh: localizedValueSchema,
});

export const NullableI18nSchema = I18nSchema.nullable();

export type I18n = z.infer<typeof I18nSchema>;
