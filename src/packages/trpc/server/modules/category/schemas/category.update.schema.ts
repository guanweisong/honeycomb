import { CategoryInsertSchema } from "@/packages/trpc/server/modules/category/schemas/category.insert.schema";
import { IdSchema } from "@/packages/trpc/server/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/server/schemas/clean.zod";

/**
 * 更新分类时的数据验证 schema。
 */
export const CategoryUpdateSchema = CategoryInsertSchema.partial().extend({
  id: IdSchema,
});

export type CategoryUpdate = CleanZod<typeof CategoryUpdateSchema>;
