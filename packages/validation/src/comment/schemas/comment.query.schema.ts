import { z } from "zod";
import { CommentType } from "server/types/CommentType";

const CommentTypeEnum = z.nativeEnum(CommentType);

export const CommentQuerySchema = z.object({
  type: CommentTypeEnum,
});
