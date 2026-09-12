import { z } from "zod";
import { HttpUrlSchema } from "@/packages/application/http-url-schema";
import {
  hasUpdateFields,
  I18nSchema,
} from "@/packages/application/validation";
import { NullableLocalizedInputSchema } from "@/packages/domain/localization/i18n";
import { IdSchema } from "@/packages/domain/shared/id.schema";

const localizedSettingFields = {
  siteName: I18nSchema.partial(),
  siteSubName: I18nSchema.partial(),
  siteCopyright: I18nSchema.partial(),
  siteSignature: I18nSchema.partial(),
} as const;

const SettingRecordUrlSchema = z
  .union([HttpUrlSchema, z.string().trim().length(0)])
  .nullable()
  .optional();

/** 后台设置表单的完整传输边界。 */
export const SettingAdminUpdateSchema = z.object({
  id: IdSchema,
  ...localizedSettingFields,
  siteRecordNo: z.string().trim().nullable().optional(),
  siteRecordUrl: SettingRecordUrlSchema,
});

/** Repository 内部更新边界；允许显式清空整个本地化字段。 */
export const SettingPatchSchema = SettingAdminUpdateSchema.partial()
  .extend({
    id: IdSchema,
    siteName: NullableLocalizedInputSchema.optional(),
    siteSubName: NullableLocalizedInputSchema.optional(),
    siteCopyright: NullableLocalizedInputSchema.optional(),
    siteSignature: NullableLocalizedInputSchema.optional(),
  })
  .refine(hasUpdateFields, "至少修改一个字段");

export type SettingPatch = z.output<typeof SettingPatchSchema>;
