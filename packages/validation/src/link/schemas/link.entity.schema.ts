import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { link } from "@honeycomb/db/src/schema";

/**
 * 友情链接实体 Zod schema。
 * 该 schema 是基于数据库中的 'link' 表结构自动生成的 (drizzle-zod)。
 * 它代表了从数据库查询友情链接时返回的完整对象结构。
 */
export const LinkEntitySchema = createSelectSchema(link);

/**
 * 友情链接实体的 TypeScript 类型。
 * 这是从 LinkEntitySchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用链接对象的结构。
 */
export type LinkEntity = CleanZod<typeof LinkEntitySchema>;
