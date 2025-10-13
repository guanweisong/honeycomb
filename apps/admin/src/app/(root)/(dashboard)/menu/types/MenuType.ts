import { MENU_TYPE, MenuType as MenuTypeType } from "@honeycomb/db";

/**
 * 菜单类型枚举。
 * 定义了菜单项的类型，例如分类或页面。
 */
export const MenuType = Object.freeze({
  CATEGORY: MENU_TYPE[0],
  PAGE: MENU_TYPE[1],
} as const);
export type MenuType = MenuTypeType;

/**
 * 菜单类型对应的中文名称映射。
 * 提供了菜单类型的国际化显示。
 */
export const MenuTypeName = Object.freeze({
  CATEGORY: "分类",
  PAGE: "页面",
} as const);
