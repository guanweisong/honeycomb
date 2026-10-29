import { enumCheck } from "@/lib/db/constraint-helpers";
import { MultiLangEnum, supportedLanguages } from "@/lib/i18n/i18n";
import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { objectId } from "@/lib/db/object-id";
import { withTimestamps } from "@/lib/db/timestamps";

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
    tagLocaleCheck: enumCheck(
      "tag_translation_locale_check",
      table.locale,
      supportedLanguages,
    ),
  }),
);
