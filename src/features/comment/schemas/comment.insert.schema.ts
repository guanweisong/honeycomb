import { CaptchaSchema } from "@/lib/validation/captcha.schema";
import {
  PublicCommentBaseSchema,
  PublicCommentSchema,
} from "@/features/comment/schemas/comment.public.schema";

export const CommentInsertBaseSchema = PublicCommentBaseSchema.extend(
  CaptchaSchema.shape,
);

export const CommentInsertSchema = PublicCommentSchema.safeExtend(
  CaptchaSchema.shape,
);
