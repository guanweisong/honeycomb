import { z } from "zod";

import { HttpUrlSchema } from "@/lib/validation/http-url-schema";

import { hasUpdateFields, I18nSchema } from "@/lib/validation/validation";

import { NullableLocalizedInputSchema } from "@/lib/i18n/i18n";

import { IdSchema } from "@/lib/validation/id.schema";

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
export const SettingAdminUpdateSchema = z.strictObject({
  id: IdSchema,
  expectedVersion: z.number().int().nonnegative(),
  ...localizedSettingFields,
  siteRecordNo: z.string().trim().nullable().optional(),
  siteRecordUrl: SettingRecordUrlSchema,
});

/** 设置持久化更新边界；允许显式清空整个本地化字段。 */
export const SettingPatchSchema = SettingAdminUpdateSchema.partial()
  .extend({
    id: IdSchema,
    expectedVersion: z.number().int().nonnegative(),
    siteName: NullableLocalizedInputSchema.optional(),
    siteSubName: NullableLocalizedInputSchema.optional(),
    siteCopyright: NullableLocalizedInputSchema.optional(),
    siteSignature: NullableLocalizedInputSchema.optional(),
  })
  .refine((input) => {
    const fields = { ...input, expectedVersion: undefined };
    return hasUpdateFields(fields);
  }, "至少修改一个字段");
