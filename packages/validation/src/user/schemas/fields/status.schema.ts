import { z } from "zod";
import { UserStatus } from ".prisma/client";

export const UserStatusEnum = z.nativeEnum(UserStatus);

export const StatusSchema = UserStatusEnum.default(UserStatus.ENABLE);
