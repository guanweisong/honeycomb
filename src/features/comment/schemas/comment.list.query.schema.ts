import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import { queryString } from "@/lib/validation/query.string.schema";
import { QueryStringArraySchema } from "@/lib/validation/query.string.schema";

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
