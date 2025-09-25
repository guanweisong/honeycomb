import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { CommentUpdateSchema } from "@honeycomb/validation/comment/schemas/comment.update.schema";
import { CommentInsertSchema } from "@honeycomb/validation/comment/schemas/comment.insert.schema";

export const CommentListQuerySchema = PaginationQuerySchema.extend({
  content: CommentInsertSchema.shape.content.optional(),
  status: CommentUpdateSchema.shape.status.optional(),
  email: CommentInsertSchema.shape.email.optional(),
  ip: CommentUpdateSchema.shape.id.optional(),
  author: CommentInsertSchema.shape.author.optional(),
});
