import { z } from "zod";
import { enumFrom } from "../../schemas/enum.helpers";
import { COMMENT_REF_TYPE } from "@honeycomb/db";

const CommentTypeEnum = enumFrom(COMMENT_REF_TYPE);

export const CommentQuerySchema = z.object({
  type: CommentTypeEnum,
});
