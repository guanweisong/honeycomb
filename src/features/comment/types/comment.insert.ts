import type { z } from "zod";
import type { PublicCommentSchema } from "../schema/comment.public.schema";
import type { CommentInsertSchema } from "../schema/comment.insert.schema";

export type PublicCommentInput = z.output<typeof PublicCommentSchema>;

export type CommentInsertInput = z.output<typeof CommentInsertSchema>;

export interface CommentRequestMetadata {
  ip: string | null;
  userAgent: string | null;
}
