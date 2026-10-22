import type { z } from "zod";
import type { PublicCommentSchema } from "../schemas/comment.public.schema";
import type { CommentInsertSchema } from "../schemas/comment.insert.schema";
import type { CommentRecord } from "./comment.read-model";

export type PublicCommentInput = z.output<typeof PublicCommentSchema>;

export type CommentInsertInput = z.output<typeof CommentInsertSchema>;

export type CommentRequestMetadata = Pick<CommentRecord, "ip" | "userAgent">;
