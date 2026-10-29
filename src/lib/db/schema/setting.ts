import { enumCheck } from "@/lib/db/constraint-helpers";
import { MultiLangEnum, supportedLanguages } from "@/lib/i18n/i18n";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "@/lib/db/object-id";
import { withTimestamps } from "@/lib/db/timestamps";

/**
 * 网站设置表 (setting)
 * 存储全局的网站配置信息。
 */
export const setting = sqliteTable(
  "setting",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    version: integer("version").default(0).notNull(),
    singletonKey: integer("singleton_key").default(1).notNull(),
    siteRecordNo: text("site_record_no"), // 网站备案号
    siteRecordUrl: text("site_record_url"), // 备案号链接
    ...withTimestamps(),
  },
  (table) => ({
    settingVersionCheck: check(
      "setting_version_check",
      sql`${table.version} >= 0`,
    ),
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
    settingLocaleCheck: enumCheck(
      "setting_translation_locale_check",
      table.locale,
      supportedLanguages,
    ),
  }),
);
