import { CommentInsertBaseSchema } from "@/features/comment/schemas/comment.insert.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { CleanZod } from "@/packages/trpc/api/schemas/clean.zod";
import { CommentStatus } from "@/packages/domain/content/comment";
import { z } from "zod";

/**
 * 更新评论状态的数据验证 schema。
 */
export const CommentUpdateSchema = CommentInsertBaseSchema.partial().extend({
  id: IdSchema,
  status: z.nativeEnum(CommentStatus).optional(),
});

export type CommentUpdate = CleanZod<typeof CommentUpdateSchema>;
