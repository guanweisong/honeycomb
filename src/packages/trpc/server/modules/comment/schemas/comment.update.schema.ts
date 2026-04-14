import { CommentInsertSchema } from "@/packages/trpc/server/modules/comment/schemas/comment.insert.schema";
import { IdSchema } from "@/packages/trpc/server/schemas/fields/id.schema";
import { CleanZod } from "@/packages/trpc/server/schemas/clean.zod";

/**
 * 更新评论状态的数据验证 schema。
 */
export const CommentUpdateSchema = CommentInsertSchema.partial().extend({
  id: IdSchema,
});

export type CommentUpdate = CleanZod<typeof CommentUpdateSchema>;
