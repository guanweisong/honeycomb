import { TagInsertSchema } from "@/packages/validation/schemas/tag/tag.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";

/**
 * 更新标签时的数据验证 schema
 */
export const TagUpdateSchema = TagInsertSchema.partial().extend({
  id: IdSchema,
});
