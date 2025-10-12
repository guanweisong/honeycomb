import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { CommentUpdateSchema } from "@honeycomb/validation/comment/schemas/comment.update.schema";
import { CommentInsertSchema } from "@honeycomb/validation/comment/schemas/comment.insert.schema";

/**
 * 获取评论列表时的查询参数验证 schema。
 * 该 schema 扩展了通用的分页查询 schema (`PaginationQuerySchema`)。
 * 允许通过以下字段对评论列表进行筛选（所有筛选字段均为可选）：
 * - content: 评论内容
 * - status: 评论状态
 * - email: 提交者邮箱
 * - ip: 提交者 IP 地址 (复用了 `CommentUpdateSchema` 中的 `id` 字段)
 * - author: 提交者名称
 */
export const CommentListQuerySchema = PaginationQuerySchema.extend({
  content: CommentInsertSchema.shape.content.optional(),
  status: CommentUpdateSchema.shape.status.optional(),
  email: CommentInsertSchema.shape.email.optional(),
  ip: CommentUpdateSchema.shape.id.optional(),
  author: CommentInsertSchema.shape.author.optional(),
});
