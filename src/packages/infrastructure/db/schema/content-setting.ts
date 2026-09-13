import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";

/**
 * 网站设置表 (setting)
 * 存储全局的网站配置信息。
 */
export const setting = sqliteTable(
  "setting",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    singletonKey: integer("singleton_key").default(1).notNull(),
    siteRecordNo: text("site_record_no"), // 网站备案号
    siteRecordUrl: text("site_record_url"), // 备案号链接
    ...withTimestamps(),
  },
  (table) => ({
    settingSingletonCheck: check(
      "setting_singleton_check",
      sql`${table.singletonKey} = 1`,
    ),
    settingSingletonIdx: uniqueIndex("setting_singleton_idx").on(
      table.singletonKey,
    ),
  }),
);

export const settingTranslation = sqliteTable(
  "setting_translation",
  {
    settingId: text("setting_id")
      .notNull()
      .references(() => setting.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    siteName: text("site_name"),
    siteSubName: text("site_sub_name"),
    siteSignature: text("site_signature"),
    siteCopyright: text("site_copyright"),
  },
  (table) => ({
    settingLocalePk: primaryKey({ columns: [table.settingId, table.locale] }),
    settingLocaleCheck: check(
      "setting_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);
