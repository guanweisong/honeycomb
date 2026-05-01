import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { CleanZod } from "../../../schemas/clean.zod";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";

/**
 * 获取标签列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'name' 字段对标签列表进行筛选。
 */
export const TagListQuerySchema = PaginationQuerySchema.extend({
  id: IdSchema.array().optional(),
  name: queryString(),
}).partial();

/**
 * 标签列表查询参数的 TypeScript 类型。
 * 从 `TagListQuerySchema` 推断而来。
 */
export type TagListQueryInput = CleanZod<typeof TagListQuerySchema>;
