import { PostInsertSchema } from "@/packages/trpc/api/modules/post/schemas/post.insert.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新文章时的数据验证 schema。
 */
export const PostUpdateSchema = PostInsertSchema.partial().extend({
  id: IdSchema,
});

export type PostUpdate = CleanZod<typeof PostUpdateSchema>;
