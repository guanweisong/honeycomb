import { enumWithDefault } from "../../../schemas/enum.helpers";
import { CATEGORY_STATUS } from "@honeycomb/db";

export const CategoryStatusEnum = enumWithDefault(CATEGORY_STATUS, "ENABLE");

export const StatusSchema = CategoryStatusEnum;
