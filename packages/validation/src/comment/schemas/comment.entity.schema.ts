import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import * as schema from "@honeycomb/db/schema";

/**
 * 评论实体 Zod schema。
 * 该 schema 是基于数据库中的 'comment' 表结构自动生成的 (drizzle-zod)。
 * 它代表了从数据库查询评论时返回的完整对象结构。
 */
export const CommentEntitySchema = createSelectSchema(schema.comment);

/**
 * 评论实体的 TypeScript 类型。
 * 这是从 CommentEntitySchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用评论对象的结构。
 */
export type CommentEntity = CleanZod<typeof CommentEntitySchema>;
