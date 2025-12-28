import { PaginationQuerySchema } from "@/packages/validation/schemas/pagination.query.schema";
import { PostInsertSchema } from "@/packages/validation/post/schemas/post.insert.schema";
import { UserInsertSchema } from "@/packages/validation/user/schemas/user.insert.schema";
import { CleanZod } from "../../clean.zod";
import { z } from "zod";
import { TagInsertSchema } from "@/packages/validation/tag/schemas/tag.insert.schema";

/**
 * 获取文章列表时的查询参数验证 schema。
 * 1. 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 2. 添加了 'title', 'content', 'categoryId', 'userName' 等可选的筛选字段。
 * 3. 特别地，它重写了 'status' 和 'type' 字段，使其可以接受一个字符串数组。
 *    这允许客户端通过提供多个状态或类型值来筛选文章，
 *    例如 `?status=published&status=draft`。
 */
export const PostListQuerySchema = PaginationQuerySchema.extend({
  title: PostInsertSchema.shape.title.optional(),
  content: PostInsertSchema.shape.content.optional(),
  status: PostInsertSchema.shape.status.optional(),
  type: PostInsertSchema.shape.type.optional(),
  categoryId: PostInsertSchema.shape.categoryId.optional(),
  userName: UserInsertSchema.shape.name.optional(),
  tagName: TagInsertSchema.shape.name.optional(),
})
  .extend({
    status: z.array(z.string()).optional(),
    type: z.array(z.string()).optional(),
  })
  .partial();

/**
 * 文章列表查询参数的 TypeScript 类型。
 * 从 `PostListQuerySchema` 推断而来。
 */
export type PostListQueryInput = CleanZod<typeof PostListQuerySchema>;
