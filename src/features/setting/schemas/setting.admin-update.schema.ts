import { z } from "zod";
import { HttpUrlSchema } from "@/lib/validation/http-url-schema";
import { I18nSchema } from "@/lib/validation/validation";
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
