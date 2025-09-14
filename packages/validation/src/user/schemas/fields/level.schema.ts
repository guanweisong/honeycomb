import { enumFrom } from "../../../schemas/enum.helpers";
import { USER_LEVEL } from "@honeycomb/db";

export const UserLevelEnum = enumFrom(USER_LEVEL);

export const LevelSchema = UserLevelEnum;
