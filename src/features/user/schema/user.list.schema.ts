import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import {
  QueryStringArraySchema,
  queryString,
} from "@/lib/validation/query.string.schema";

/**
 * 获取用户列表时的查询参数验证 schema。
 */
export const UserListQuerySchema = PaginationQuerySchema.extend({
  status: QueryStringArraySchema,
  level: QueryStringArraySchema,
  name: queryString(),
}).partial();
