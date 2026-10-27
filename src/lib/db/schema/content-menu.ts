import { MenuType } from "@/features/menu/types/menu.type";
import {
  sqliteTable,
  text,
  integer,
  index,
  foreignKey,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { objectId } from "@/lib/db/object-id";
import { withTimestamps } from "@/lib/db/timestamps";
import { category } from "@/lib/db/schema/content-category";
import { page } from "@/lib/db/schema/content-page";
import { enumCheck } from "@/lib/db/constraint-helpers";

/**
 * 菜单表 (menu)
 * 存储网站导航菜单的结构。
 */
export const menu = sqliteTable(
  "menu",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    parent: text("parent"), // 父菜单项ID
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }), // 关联分类ID
    pageId: text("page_id").references(() => page.id, {
      onDelete: "cascade",
    }), // 关联页面ID
    customId: text("custom_id"), // 关联自定义实体ID
    power: integer("power").notNull(), // 排序权重
    type: text("type").notNull(), // 菜单项类型 (CATEGORY, PAGE, CUSTOM)
    ...withTimestamps(),
  },
  (table) => ({
    menuParentFk: foreignKey({
      columns: [table.parent],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    menuParentIdx: index("menu_parent_idx").on(table.parent),
    menuPowerIdx: index("menu_power_idx").on(table.power),
    menuTypeIdx: index("menu_type_idx").on(table.type),
    menuTypeCheck: enumCheck(
      "menu_type_check",
      table.type,
      Object.values(MenuType),
    ),
  }),
);

/** One revision for the complete navigation snapshot, including an empty initial tree. */
export const menuRevision = sqliteTable(
  "menu_revision",
  {
    singletonKey: integer("singleton_key").primaryKey().default(1).notNull(),
    version: integer("version").default(0).notNull(),
  },
  (table) => [
    check("menu_revision_singleton_check", sql`${table.singletonKey} = 1`),
    check("menu_revision_version_check", sql`${table.version} >= 0`),
  ],
);
