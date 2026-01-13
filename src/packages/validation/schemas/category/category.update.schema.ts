import { CategoryInsertSchema } from "@/packages/validation/schemas/category/category.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";

/**
 * 更新分类时的数据验证 schema。
 */
export const CategoryUpdateSchema = CategoryInsertSchema.partial().extend({
  id: IdSchema,
});
