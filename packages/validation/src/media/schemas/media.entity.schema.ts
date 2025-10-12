import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { media } from "@honeycomb/db/src/schema";

/**
 * 媒体实体 Zod schema。
 * 该 schema 是基于数据库中的 'media' 表结构自动生成的 (drizzle-zod)。
 * 它代表了从数据库查询媒体文件时返回的完整对象结构。
 */
export const MediaEntitySchema = createSelectSchema(media);

/**
 * 媒体实体的 TypeScript 类型。
 * 这是从 MediaEntitySchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用媒体对象的结构。
 */
export type MediaEntity = CleanZod<typeof MediaEntitySchema>;
