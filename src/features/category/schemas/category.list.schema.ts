import { z } from "zod";
import { EnableStatus } from "@/lib/validation/enable-status";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import { queryString } from "@/lib/validation/query.string.schema";

/**
 * 获取分类列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'title', 'path', 和 'status' 对分类列表进行筛选。
 * 筛选字符串按查询规则去除空白，空字符串视为未提供。
 */
export const CategoryListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  path: queryString(),
  status: queryString().pipe(z.enum(EnableStatus).optional()),
  id: queryString(),
}).partial();
