import type { z } from "zod";
import type { PublicCommentSchema } from "@/features/comment/schemas/comment.public.schema";
import type { CommentInsertSchema } from "@/features/comment/schemas/comment.insert.schema";
import type { CommentRecord } from "@/features/comment/types/comment.read-model";

export type PublicCommentInput = z.output<typeof PublicCommentSchema>;

export type CommentInsertInput = z.output<typeof CommentInsertSchema>;

export type CommentRequestMetadata = Pick<CommentRecord, "ip" | "userAgent">;
