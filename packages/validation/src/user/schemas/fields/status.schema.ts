import { z } from "zod";
import { USER_STATUS } from "@honeycomb/db";

export const UserStatusEnum = z.enum([...USER_STATUS]);

export const StatusSchema = UserStatusEnum.default("ENABLE");
