import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { menu } from "@honeycomb/db/src/schema";

/**
 * 菜单实体 Zod schema。
 * 该 schema 是基于数据库中的 'menu' 表结构自动生成的 (drizzle-zod)。
 * 它代表了从数据库查询菜单项时返回的完整对象结构。
 */
export const MenuEntitySchema = createSelectSchema(menu);

/**
 * 菜单实体的 TypeScript 类型。
 * 这是从 MenuEntitySchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用菜单对象的结构。
 */
export type MenuEntity = CleanZod<typeof MenuEntitySchema>;
