import { z } from "zod";
import { requiredString } from "@/packages/validation/utils/required.string.schema";

export const I18nSchema = z.object({
  en: requiredString("英文不能为空"),
  zh: requiredString("中文不能为空"),
});

export const NullableI18nSchema = I18nSchema.nullable();

export type I18n = z.infer<typeof I18nSchema>;
