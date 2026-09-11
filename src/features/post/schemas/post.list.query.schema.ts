import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { QueryStringArraySchema } from "@/packages/trpc/api/schemas/query.string.schema";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";

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

/**
 * 文章列表查询参数的 TypeScript 类型。
 * 从 `PostListQuerySchema` 推断而来。
 */
export type PostListQueryInput = CleanZod<typeof PostListQuerySchema>;
