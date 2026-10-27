import { z } from "zod";
import { hasUpdateFields } from "@/lib/validation/validation";
import { NullableLocalizedInputSchema } from "@/lib/i18n/i18n";
import { IdSchema } from "@/lib/validation/id.schema";
import { SettingAdminUpdateSchema } from "@/features/setting/schemas/setting.admin-update.schema";

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
