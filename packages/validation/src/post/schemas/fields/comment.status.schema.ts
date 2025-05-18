import { z } from "zod";
import { PostCommentStatus } from ".prisma/client";

const CommentStatusEnum = z.nativeEnum(PostCommentStatus);

export const CommentStatusSchema = CommentStatusEnum.default(
  PostCommentStatus.ENABLE,
);
