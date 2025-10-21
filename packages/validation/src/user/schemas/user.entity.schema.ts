import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import * as schema from "@honeycomb/db/schema";

/**
 * 用户实体 Zod schema。
 * 该 schema 是基于数据库中的 'user' 表结构自动生成的 (drizzle-zod)。
 * 它代表了从数据库查询用户时返回的完整对象结构。
 */
export const UserEntitySchema = createSelectSchema(schema.user);

/**
 * 用户实体的 TypeScript 类型。
 * 这是从 UserEntitySchema 推断出的纯净 TypeScript 类型，用于在代码中方便地引用用户对象的结构。
 */
export type UserEntity = CleanZod<typeof UserEntitySchema>;
