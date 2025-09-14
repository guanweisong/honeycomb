import { enumFrom, enumWithDefault } from "../../../schemas/enum.helpers";
import { POST_TYPE } from "@honeycomb/db";

const PostTypeEnum = enumFrom(POST_TYPE);

export const TypeSchema = enumWithDefault(POST_TYPE, "ARTICLE");
