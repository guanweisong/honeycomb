import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import {
  sqliteTable,
  text,
  index,
  uniqueIndex,
  foreignKey,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";
import { enumCheck } from "../constraint-helpers";

export const category = sqliteTable(
  "category",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    parent: text("parent"), // 父分类ID，用于构建层级关系
    status: text("status").default(EnableStatus.ENABLE).notNull(), // 分类状态，默认启用
    path: text("path").notNull(), // 分类的访问路径/slug
    ...withTimestamps(),
  },
  (table) => ({
    categoryParentFk: foreignKey({
      columns: [table.parent],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    categoryPathIdx: uniqueIndex("category_path_idx").on(table.path),
    categoryStatusIdx: index("category_status_idx").on(table.status),
    categoryParentIdx: index("category_parent_idx").on(table.parent),
    categoryStatusCheck: enumCheck(
      "category_status_check",
      table.status,
      Object.values(EnableStatus),
    ),
  }),
);

export const categoryTranslation = sqliteTable(
  "category_translation",
  {
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
  },
  (table) => ({
    categoryLocalePk: primaryKey({ columns: [table.categoryId, table.locale] }),
    categoryLocaleCheck: check(
      "category_translation_locale_check",
      sql`${table.locale} in ('zh', 'en')`,
    ),
  }),
);
