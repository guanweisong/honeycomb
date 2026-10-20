import { CaptchaSchema } from "@/lib/validation/captcha.schema";
import {
  PublicCommentBaseSchema,
  PublicCommentSchema,
} from "@/features/comment/schema";
import { z } from "zod";
export { CommentSiteSchema } from "@/features/comment/schema";

export const CommentInsertBaseSchema = PublicCommentBaseSchema.extend(
  CaptchaSchema.shape,
);
export const CommentInsertSchema = PublicCommentSchema.safeExtend(
  CaptchaSchema.shape,
);
export type CommentInsertInput = z.output<typeof CommentInsertSchema>;
