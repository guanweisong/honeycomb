import { z } from "zod";
import { requiredString } from "@/packages/validation/utils/required.string.schema";

export const I18nSchema = z.object({
  en: requiredString("英文不能为空"),
  zh: requiredString("中文不能为空"),
});

export const NullableI18nSchema = I18nSchema.nullable();

export const OptionalI18nSchema = z
  .object({
    en: z.string().optional().nullable(),
    zh: z.string().optional().nullable(),
  })
  .nullable()
  .optional();

export type I18n = z.infer<typeof I18nSchema>;
