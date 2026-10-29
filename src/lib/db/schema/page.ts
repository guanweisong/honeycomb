import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { MultiLangEnum, supportedLanguages } from "@/lib/i18n/i18n";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "@/lib/db/object-id";
import { withTimestamps } from "@/lib/db/timestamps";
import { user } from "@/lib/db/schema/auth";
import { enumCheck } from "@/lib/db/constraint-helpers";

/**
 * 独立页面表 (page)
 * 存储独立的、非文章性质的页面，如 "关于我"、"联系方式" 等。
 */
export const page = sqliteTable(
  "page",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "no action" }), // 作者ID
    status: text("status").default(PageStatus.TO_AUDIT).notNull(), // 页面状态，默认待审核
    template: text("template").default(PageTemplate.DEFAULT).notNull(), // 页面模板
    version: integer("version").default(0).notNull(),
    creationToken: text("creation_token"),
    creationInputHash: text("creation_input_hash"),
    views: integer("views").default(0).notNull(), // 浏览次数
    ...withTimestamps(),
  },
  (table) => ({
    pageStatusTemplateCreatedIdx: index("page_status_template_created_idx").on(
      table.status,
      table.template,
      table.createdAt,
    ),
    pageAuthorCreatedIdx: index("page_author_created_idx").on(
      table.authorId,
      table.createdAt,
    ),
    pageStatusCheck: enumCheck(
      "page_status_check",
      table.status,
      Object.values(PageStatus),
    ),
    pageTemplateCheck: enumCheck(
      "page_template_check",
      table.template,
      Object.values(PageTemplate),
    ),
    pageAuthorCreationTokenUnique: uniqueIndex(
      "page_author_creation_token_unique",
    ).on(table.authorId, table.creationToken),
    pageVersionCheck: check("page_version_check", sql`${table.version} >= 0`),
    pageViewsCheck: check("page_views_check", sql`${table.views} >= 0`),
  }),
);

export const pageTranslation = sqliteTable(
  "page_translation",
  {
    pageId: text("page_id")
      .notNull()
      .references(() => page.id, { onDelete: "cascade" }),
    locale: text("locale").$type<MultiLangEnum>().notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
  },
  (table) => ({
    pageLocalePk: primaryKey({ columns: [table.pageId, table.locale] }),
    pageLocaleCheck: enumCheck(
      "page_translation_locale_check",
      table.locale,
      supportedLanguages,
    ),
  }),
);
