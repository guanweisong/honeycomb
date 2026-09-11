import {
  CommentAuthorSchema,
  CommentContentSchema,
  CommentEmailSchema,
  CommentSiteSchema,
} from "@/features/comment/schemas/comment.insert.schema";
import { IdSchema } from "@/packages/domain/shared/id.schema";
import { CommentStatus } from "@/packages/domain/content/comment";
import { z } from "zod";

/**
 * 更新评论状态的数据验证 schema。
 */
export const CommentUpdateSchema = z
  .object({
    id: IdSchema,
    author: CommentAuthorSchema.optional(),
    content: CommentContentSchema.optional(),
    email: CommentEmailSchema.optional(),
    site: CommentSiteSchema,
    status: z.nativeEnum(CommentStatus).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.author !== undefined ||
      input.content !== undefined ||
      input.email !== undefined ||
      input.site !== undefined ||
      input.status !== undefined,
    "至少修改一个字段",
  );

export type CommentUpdate = z.infer<typeof CommentUpdateSchema>;
