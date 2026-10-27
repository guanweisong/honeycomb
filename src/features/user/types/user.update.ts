import type { UserUpdateSchema } from "@/features/user/schemas/user.write.schema";
import type { z } from "zod";

export type UserUpdate = z.output<typeof UserUpdateSchema>;

export type UserUpdateCommandInput = UserUpdate;
