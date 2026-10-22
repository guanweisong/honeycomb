import type { UserUpdateSchema } from "../schemas/user.write.schema";
import type { z } from "zod";

export type UserUpdate = z.output<typeof UserUpdateSchema>;

export type UserUpdateCommandInput = UserUpdate;
