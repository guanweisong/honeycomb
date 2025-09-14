import { enumFrom, enumWithDefault } from "../../../schemas/enum.helpers";
import { POST_COMMENT_STATUS } from "@honeycomb/db";

const CommentStatusEnum = enumFrom(POST_COMMENT_STATUS);

export const CommentStatusSchema = enumWithDefault(POST_COMMENT_STATUS, "ENABLE");
