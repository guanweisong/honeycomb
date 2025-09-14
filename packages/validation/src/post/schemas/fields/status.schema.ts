import { enumFrom, enumWithDefault } from "../../../schemas/enum.helpers";
import { POST_STATUS } from "@honeycomb/db";

const PostStatusEnum = enumFrom(POST_STATUS);

export const StatusSchema = enumWithDefault(POST_STATUS, "TO_AUDIT");
