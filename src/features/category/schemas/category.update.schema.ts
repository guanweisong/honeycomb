import { CategoryInsertSchema } from "@/features/category/schemas/category.insert.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { hasUpdateFields } from "@/packages/application/validation";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新分类时的数据验证 schema。
 */
export const CategoryUpdateSchema = CategoryInsertSchema.partial().extend({
  id: IdSchema,
}).refine(hasUpdateFields, "至少修改一个字段");

export type CategoryUpdate = CleanZod<typeof CategoryUpdateSchema>;
