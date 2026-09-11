import { CaptchaSchema } from "@/packages/trpc/api/schemas/captcha.schema";
import {
  PublicCommentBaseSchema,
  PublicCommentSchema,
} from "@/features/comment/application/write-schema";
import { z } from "zod";
export {
  CommentAuthorSchema,
  CommentContentSchema,
  CommentEmailSchema,
  CommentSiteSchema,
} from "@/features/comment/application/write-schema";

export const CommentInsertBaseSchema = PublicCommentBaseSchema.extend(
  CaptchaSchema.shape,
);
export const CommentInsertSchema = PublicCommentSchema.safeExtend(
  CaptchaSchema.shape,
);
export type CommentInsertInput = z.output<typeof CommentInsertSchema>;
