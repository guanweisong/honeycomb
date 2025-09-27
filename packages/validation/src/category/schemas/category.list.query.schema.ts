import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
export const CategoryListQuerySchema = PaginationQuerySchema.extend({
  title: CategoryUpdateSchema.shape.title,
  path: CategoryUpdateSchema.shape.path,
  status: CategoryUpdateSchema.shape.status,
});

export type CategoryListQueryInput = CleanZod<typeof CategoryListQuerySchema>;
