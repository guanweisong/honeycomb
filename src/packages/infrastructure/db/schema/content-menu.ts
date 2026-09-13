import { MenuType } from "@/packages/domain/navigation/menu";
import {
  sqliteTable,
  text,
  integer,
  index,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";
import { category } from "./content-category";
import { page } from "./content-page";
import { enumCheck } from "../constraint-helpers";

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
