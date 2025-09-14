import { enumFrom, enumWithDefault } from "../../../schemas/enum.helpers";
import { PAGE_STATUS } from "@honeycomb/db";

const PageStatusEnum = enumFrom(PAGE_STATUS);

export const StatusSchema = enumWithDefault(PAGE_STATUS, "TO_AUDIT");
