import { CommentInsertSchema } from "@/packages/validation/schemas/comment/comment.insert.schema";
import { IdSchema } from "@/packages/validation/utils/fields/id.schema";
import { CleanZod } from "@/packages/validation/utils/clean.zod";

/**
 * 更新评论状态的数据验证 schema。
 */
export const CommentUpdateSchema = CommentInsertSchema.partial().extend({
  id: IdSchema,
});

export type CommentUpdate = CleanZod<typeof CommentUpdateSchema>;
