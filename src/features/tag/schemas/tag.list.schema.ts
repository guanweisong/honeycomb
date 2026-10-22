import { IdSchema } from "@/lib/validation/id.schema";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import { queryString } from "@/lib/validation/query.string.schema";
import { MAX_BATCH_SIZE } from "@/lib/validation/resource-limits";

/**
 * 获取标签列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'name' 字段对标签列表进行筛选。
 */
export const TagListQuerySchema = PaginationQuerySchema.extend({
  id: IdSchema.array().max(MAX_BATCH_SIZE).optional(),
  name: queryString(),
}).partial();
