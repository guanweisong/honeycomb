import { enumWithDefault } from "../../../schemas/enum.helpers";
import { COMMENT_STATUS } from "@honeycomb/db";

export const CommentStatusEnum = enumWithDefault(COMMENT_STATUS, "PUBLISH");

export const StatusSchema = CommentStatusEnum;
