import { createUpdateSchema } from "drizzle-zod";
import { setting } from "@honeycomb/db/schema";

/**
 * 更新网站设置时的数据验证 schema。
 * 1. 使用 `createUpdateSchema` 创建基础 schema，其中字段默认为可选。
 * 2. 使用 `.pick()` 方法指定了所有允许更新的设置项以及用于识别记录的 'id'。
 * 3. 使用 `.required({ id: true })` 强制要求 'id' 字段必须存在，以确保能定位到要更新的设置记录。
 */
export const SettingUpdateSchema = createUpdateSchema(setting)
  .pick({
    siteName: true,
    siteSubName: true,
    id: true,
    siteCopyright: true,
    siteSignature: true,
    siteRecordNo: true,
    siteRecordUrl: true,
  })
  .required({ id: true });
