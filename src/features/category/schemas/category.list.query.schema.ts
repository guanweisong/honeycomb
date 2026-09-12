import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { z } from "zod";

/**
 * 获取分类列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'title', 'path', 和 'status' 对分类列表进行筛选。
 * 这些筛选字段的定义复用了 `CategoryUpdateSchema` 中的相应字段。
 */
export const CategoryListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  path: queryString(),
  status: queryString().pipe(z.enum(EnableStatus).optional()),
  id: queryString(),
}).partial();
