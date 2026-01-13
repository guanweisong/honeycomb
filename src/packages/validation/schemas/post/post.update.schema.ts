import { PostInsertSchema } from "@/packages/validation/schemas/post/post.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";

/**
 * 更新文章时的数据验证 schema。
 */
export const PostUpdateSchema = PostInsertSchema.partial().extend({
  id: IdSchema,
});
