import * as schema from "@/packages/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { I18nSchema } from "@/packages/validation/utils/i18n.schema";

/**
 * 新增标签时的数据验证 schema。
 * 该 schema 基于数据库 'tag' 表的插入操作 schema 生成 (drizzle-zod)。
 */
export const TagInsertSchema = createInsertSchema(schema.tag).extend({
  name: I18nSchema,
});
