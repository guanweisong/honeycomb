import { CommentInsertSchema } from "@/packages/trpc/api/modules/comment/schemas/comment.insert.schema";
import { IdSchema } from "@/packages/trpc/api/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";

/**
 * 更新评论状态的数据验证 schema。
 */
export const CommentUpdateSchema = CommentInsertSchema.partial().extend({
  id: IdSchema,
});

export type CommentUpdate = CleanZod<typeof CommentUpdateSchema>;
