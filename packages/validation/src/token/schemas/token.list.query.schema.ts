import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { IdSchema } from "../../schemas/fields/id.schema";
import { ContentSchema } from "./fields/content.schema";

/**
 * 获取 Token 列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过 'userId' 和 'content' 字段对 Token 列表进行筛选。
 */
export const TokenListQuerySchema = PaginationQuerySchema.extend({
  userId: IdSchema.optional(),
  content: ContentSchema.optional(),
});
