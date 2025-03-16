import { PaginationQuerySchema } from "@/schemas/pagination.query.schema";
import { ContentSchema } from "@/app/comment/schemas/fields/content.schema";
import { StatusSchema } from "@/app/comment/schemas/fields/status.schema";
import { EmailSchema } from "@/app/user/schemas/fields/email.schema";
import { z } from "zod";
import { AuthorSchema } from "@/app/comment/schemas/fields/author.schema";

export const CommentListQuerySchema = PaginationQuerySchema.extend({
  content: ContentSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
  email: EmailSchema.optional(),
  ip: z.string().ip().optional(),
  author: AuthorSchema.optional(),
});
