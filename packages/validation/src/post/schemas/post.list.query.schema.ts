import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { PostInsertSchema } from "@honeycomb/validation/post/schemas/post.insert.schema";
import { UserInsertSchema } from "@honeycomb/validation/user/schemas/user.insert.schema";

export const PostListQuerySchema = PaginationQuerySchema.extend({
  title: PostInsertSchema.shape.title.optional(),
  content: PostInsertSchema.shape.content.optional(),
  status: PostInsertSchema.shape.status.optional(),
  type: PostInsertSchema.shape.type.optional(),
  categoryId: PostInsertSchema.shape.categoryId.optional(),
  userName: UserInsertSchema.shape.name.optional(),
});
