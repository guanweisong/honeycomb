import { z } from "zod";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import { MAX_QUERY_LENGTH } from "@/lib/validation/resource-limits";
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

export const PublicPostCursorSchema = z.object({
  createdAt: z.string().max(MAX_QUERY_LENGTH).nullable(),
  id: z.string().min(1).max(MAX_QUERY_LENGTH),
});

/**
 * A cursor opts into the chronological feed (createdAt descending, then id
 * ascending), independent of page and sort overrides. null starts the feed;
 * omission retains the existing numbered pagination and sorting.
 */
export const PublicPostListQuerySchema = PostListQuerySchema.extend({
  cursor: PublicPostCursorSchema.nullable().optional(),
});
