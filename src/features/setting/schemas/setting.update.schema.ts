import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { I18nSchema } from "@/packages/trpc/api/schemas/i18n.schema";
import { z } from "zod";

/**
 * 更新网站设置时的数据验证 schema。
 */
export const SettingUpdateSchema = z.object({
    id: IdSchema,
    siteName: I18nSchema.partial(),
    siteSubName: I18nSchema.partial(),
    siteCopyright: I18nSchema.partial(),
    siteSignature: I18nSchema.partial(),
    siteRecordNo: z.string().trim().nullable().optional(),
    siteRecordUrl: z.string().trim().nullable().optional(),
  });
