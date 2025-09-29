import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { PostInsertSchema } from "@honeycomb/validation/post/schemas/post.insert.schema";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { z } from "zod";

export const PostListQuerySchema = PaginationQuerySchema.extend({
  title: PostInsertSchema.shape.title.optional(),
  content: PostInsertSchema.shape.content.optional(),
  status: PostInsertSchema.shape.status.optional(),
  type: PostInsertSchema.shape.type.optional(),
  categoryId: PostInsertSchema.shape.categoryId.optional(),
  userName: UserInsertSchema.shape.name.optional(),
}).extend({
  status: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
});

export type PostListQueryInput = CleanZod<typeof PostListQuerySchema>;
