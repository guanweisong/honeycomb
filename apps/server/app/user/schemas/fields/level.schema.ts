import { z } from "zod";
import { UserLevel } from ".prisma/client";

export const UserLevelEnum = z.nativeEnum(UserLevel);

export const LevelSchema = UserLevelEnum;
