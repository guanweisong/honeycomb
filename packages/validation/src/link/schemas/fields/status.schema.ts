import { enumWithDefault } from "../../../schemas/enum.helpers";
import { LINK_STATUS } from "@honeycomb/db";

export const LinkStatusEnum = enumWithDefault(LINK_STATUS, "ENABLE");

export const StatusSchema = LinkStatusEnum;
