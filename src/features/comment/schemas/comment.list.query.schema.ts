import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";
import { QueryStringArraySchema } from "@/packages/trpc/api/schemas/query.string.schema";

/**
 * 获取评论列表时的查询参数验证 schema。
 */
export const CommentListQuerySchema = PaginationQuerySchema.extend({
  content: queryString(),
  status: QueryStringArraySchema,
  email: queryString(),
  ip: queryString(),
  author: queryString(),
});
