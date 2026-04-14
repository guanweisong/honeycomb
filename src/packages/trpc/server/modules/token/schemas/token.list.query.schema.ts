import { PaginationQuerySchema } from "../../../schemas/pagination.query.schema";
import { queryString } from "@/packages/trpc/server/schemas/query.string.schema";

/**
 * 获取 Token 列表时的查询参数验证 schema。
 */
export const TokenListQuerySchema = PaginationQuerySchema.extend({
  userId: queryString(),
  content: queryString(),
});
