import { createSelectSchema } from "drizzle-zod";
import { setting } from "@honeycomb/db/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { defaultI18nSchema } from "@honeycomb/db/src/i18nField";

/**
 * 网站设置实体 Zod schema。
 * 该 schema 基于数据库 'setting' 表的查询结果生成，并对多语言字段进行了扩展。
 *
 * 扩展内容：
 * - `siteName`, `siteSubName`, `siteCopyright`, `siteSignature`:
 *   这些字段被定义为国际化 (i18n) 结构，以支持多语言显示。
 */
export const SettingEntitySchema = createSelectSchema(setting).extend({
  siteName: defaultI18nSchema,
  siteSubName: defaultI18nSchema,
  siteCopyright: defaultI18nSchema,
  siteSignature: defaultI18nSchema,
});

/**
 * 网站设置实体的 TypeScript 类型。
 * 这是从 `SettingEntitySchema` 推断出的纯净 TypeScript 类型。
 */
export type SettingEntity = CleanZod<typeof SettingEntitySchema>;
