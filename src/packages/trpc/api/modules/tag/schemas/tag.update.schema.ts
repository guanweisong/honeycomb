import { TagInsertSchema } from "@/packages/trpc/api/modules/tag/schemas/tag.insert.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";

/**
 * 更新标签时的数据验证 schema
 */
export const TagUpdateSchema = TagInsertSchema.partial().extend({
  id: IdSchema,
});
