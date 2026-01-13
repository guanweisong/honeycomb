import { createUpdateSchema } from "drizzle-zod";
import * as schema from "@/packages/db/schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";
import { I18nSchema } from "@/packages/validation/utils/i18n.schema";
import { z } from "zod";

/**
 * 更新网站设置时的数据验证 schema。
 */
export const SettingUpdateSchema = createUpdateSchema(schema.setting)
  .pick({
    id: true,
    siteName: true,
    siteSubName: true,
    siteCopyright: true,
    siteSignature: true,
    siteRecordNo: true,
    siteRecordUrl: true,
  })
  .extend({
    id: IdSchema,
    siteName: I18nSchema.partial(),
    siteSubName: I18nSchema.partial(),
    siteCopyright: I18nSchema.partial(),
    siteSignature: I18nSchema.partial(),
    siteRecordNo: z.string().trim().optional(),
    siteRecordUrl: z.string().trim().optional(),
  });
