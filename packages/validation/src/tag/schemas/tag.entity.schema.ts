import { createSelectSchema } from "drizzle-zod";
import * as schema from "@honeycomb/db/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { defaultI18nSchema } from "@honeycomb/db/src/i18nField";

/**
 * 标签实体 Zod schema。
 * 该 schema 基于数据库 'tag' 表的查询结果生成，并对 `name` 字段进行了扩展。
 *
 * 扩展内容：
 * - `name`: 字段被定义为国际化 (i18n) 结构，以支持多语言显示。
 */
export const TagEntitySchema = createSelectSchema(schema.tag).extend({
  name: defaultI18nSchema,
});

/**
 * 标签实体的 TypeScript 类型。
 * 这是从 `TagEntitySchema` 推断出的纯净 TypeScript 类型。
 */
export type TagEntity = CleanZod<typeof TagEntitySchema>;
