import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  queryString,
  QueryStringArraySchema,
} from "@/lib/validation/query.string.schema";

/**
 * 获取文章列表时的查询参数验证 schema。
 */
export const PostListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  content: queryString(),
  status: QueryStringArraySchema,
  type: QueryStringArraySchema,
  categoryId: queryString(),
  tagId: queryString(),
  authorId: queryString(),
}).partial();
