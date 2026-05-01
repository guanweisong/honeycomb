import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { CleanZod } from "../../../schemas/clean.zod";
import { z } from "zod";
import { queryString } from "@/packages/trpc/api/schemas/query.string.schema";

/**
 * 获取文章列表时的查询参数验证 schema。
 */
export const PostListQuerySchema = PaginationQuerySchema.extend({
  title: queryString(),
  content: queryString(),
  status: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  categoryId: queryString(),
  tagId: queryString(),
  authorId: queryString(),
}).partial();

/**
 * 文章列表查询参数的 TypeScript 类型。
 * 从 `PostListQuerySchema` 推断而来。
 */
export type PostListQueryInput = CleanZod<typeof PostListQuerySchema>;
