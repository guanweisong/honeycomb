import { PostInsertSchema } from "@/packages/trpc/server/modules/post/schemas/post.insert.schema";
import { IdSchema } from "@/packages/trpc/server/schemas/fields/id.schema";

/**
 * 更新文章时的数据验证 schema。
 */
export const PostUpdateSchema = PostInsertSchema.partial().extend({
  id: IdSchema,
});
