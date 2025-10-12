import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { page } from "@honeycomb/db/src/schema";

/**
 * 独立页面实体 Zod schema。
 * 该 schema 是基于数据库中的 'page' 表结构自动生成的 (drizzle-zod)。
 * 它代表了从数据库查询独立页面时返回的完整对象结构。
 */
export const PageEntitySchema = createSelectSchema(page);

/**
 * 独立页面实体的 TypeScript 类型。
 * 这是从 PageEntitySchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用页面对象的结构。
 */
export type PageEntity = CleanZod<typeof PageEntitySchema>;
