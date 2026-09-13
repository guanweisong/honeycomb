import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import { sqliteTable, text, check, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";

/**
 * 标签表 (tag)
 * 存储用于标记文章的标签。
 */
export const tag = sqliteTable("tag", {
  id: text("id").primaryKey().$defaultFn(objectId),
  ...withTimestamps(),
});

export const tagTranslation = sqliteTable(
  "tag_translation",
  {
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    name: text("name").notNull(),
  },
  (table) => ({
    tagLocalePk: primaryKey({ columns: [table.tagId, table.locale] }),
    tagLocaleCheck: check(
      "tag_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);
