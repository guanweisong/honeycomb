import { MENU_TYPE, MenuType as MenuTypeType } from "@honeycomb/db";

export const MenuType = Object.freeze({
  CATEGORY: MENU_TYPE[0],
  PAGE: MENU_TYPE[1],
} as const);
export type MenuType = MenuTypeType;

export const MenuTypeName = Object.freeze({
  CATEGORY: "分类",
  PAGE: "页面",
} as const);
