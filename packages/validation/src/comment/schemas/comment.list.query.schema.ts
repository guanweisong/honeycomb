import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { ContentSchema } from "./fields/content.schema";
import { StatusSchema } from "./fields/status.schema";
import { EmailSchema } from "../../user/schemas/fields/email.schema";
import { z } from "zod";
import { AuthorSchema } from "./fields/author.schema";

export const CommentListQuerySchema = PaginationQuerySchema.extend({
  content: ContentSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
  email: EmailSchema.optional(),
  ip: z.string().optional(),
  author: AuthorSchema.optional(),
});
