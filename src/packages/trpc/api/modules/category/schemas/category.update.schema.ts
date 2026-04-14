import { CategoryInsertSchema } from "@/packages/trpc/api/modules/category/schemas/category.insert.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新分类时的数据验证 schema。
 */
export const CategoryUpdateSchema = CategoryInsertSchema.partial().extend({
  id: IdSchema,
});

export type CategoryUpdate = CleanZod<typeof CategoryUpdateSchema>;
