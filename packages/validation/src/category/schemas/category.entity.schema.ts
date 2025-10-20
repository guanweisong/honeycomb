import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { category } from "@honeycomb/db/schema";

/**
 * 分类实体 Zod schema。
 * 该 schema 是基于数据库中的 'category' 表结构自动生成的 (drizzle-zod)。
 * 它代表了从数据库查询分类时返回的完整对象结构。
 */
export const CategoryEntitySchema = createSelectSchema(category);

/**
 * 分类实体的 TypeScript 类型。
 * 这是从 CategoryEntitySchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用分类对象的结构。
 */
export type CategoryEntity = CleanZod<typeof CategoryEntitySchema>;
