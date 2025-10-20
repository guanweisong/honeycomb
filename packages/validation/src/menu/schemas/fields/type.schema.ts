import { z } from "zod";
import { MenuType } from "@honeycomb/types/menu/menu.type";

/**
 * 从数据库常量 MenuType 创建的 Zod 枚举 schema。
 * 用于验证菜单项的类型。
 */
const MenuTypeEnum = z.enum(MenuType);

/**
 * 菜单项类型（type）字段验证 schema。
 * 它基于 `MenuTypeEnum`，并设置了默认值为 "CATEGORY"。
 * 这意味着如果创建或更新菜单项时未提供类型，将自动使用 "CATEGORY"。
 */
export const TypeSchema = MenuTypeEnum.default(MenuType.CATEGORY);
