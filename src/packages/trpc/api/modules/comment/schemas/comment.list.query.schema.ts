import { PaginationQuerySchema } from "../../../schemas/pagination.query.schema";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";
import { z } from "zod";

/**
 * 获取评论列表时的查询参数验证 schema。
 */
export const CommentListQuerySchema = PaginationQuerySchema.extend({
  content: queryString(),
  status: z.array(z.string()).optional(),
  email: queryString(),
  ip: queryString(),
  author: queryString(),
});
