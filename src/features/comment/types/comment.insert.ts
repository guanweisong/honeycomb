import type { z } from "zod";
import type { PublicCommentSchema } from "../schemas/comment.public.schema";
import type { CommentInsertSchema } from "../schemas/comment.insert.schema";

export type PublicCommentInput = z.output<typeof PublicCommentSchema>;

export type CommentInsertInput = z.output<typeof CommentInsertSchema>;

export interface CommentRequestMetadata {
  ip: string | null;
  userAgent: string | null;
}
