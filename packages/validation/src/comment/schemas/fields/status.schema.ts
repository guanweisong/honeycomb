import { z } from "zod";
import { CommentStatus } from ".prisma/client";

export const CommentStatusEnum = z.nativeEnum(CommentStatus);

export const StatusSchema = CommentStatusEnum.default(CommentStatus.PUBLISH);
