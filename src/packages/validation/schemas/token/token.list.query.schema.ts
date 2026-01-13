import { PaginationQuerySchema } from "../../utils/pagination.query.schema";
import { queryString } from "@/packages/validation/utils/query.string.schema";

/**
 * 获取 Token 列表时的查询参数验证 schema。
 */
export const TokenListQuerySchema = PaginationQuerySchema.extend({
  userId: queryString(),
  content: queryString(),
});
