import { I18nSchema } from "@/packages/application/validation";
import { NullableLocalizedInputSchema } from "@/packages/domain/localization/i18n";
export { I18nSchema };
export type { I18n } from "@/packages/domain/localization/i18n";
export const NullableI18nSchema = I18nSchema.nullable();
export const OptionalI18nSchema = NullableLocalizedInputSchema.optional();
