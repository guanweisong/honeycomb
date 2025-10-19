import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

/**
 * 获取分类列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'title', 'path', 和 'status' 对分类列表进行筛选。
 * 这些筛选字段的定义复用了 `CategoryUpdateSchema` 中的相应字段。
 */
export const CategoryListQuerySchema = PaginationQuerySchema.extend({
  title: CategoryUpdateSchema.shape.title,
  path: CategoryUpdateSchema.shape.path,
  status: CategoryUpdateSchema.shape.status,
}).partial();

/**
 * 分类列表查询参数的 TypeScript 类型。
 * 从 `CategoryListQuerySchema` 推断而来，为前端或后端提供了清晰的类型定义。
 */
export type CategoryListQueryInput = CleanZod<typeof CategoryListQuerySchema>;
