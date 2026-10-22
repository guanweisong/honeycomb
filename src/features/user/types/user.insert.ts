import type { UserInsertSchema } from "../schema/user.write.schema";
import type { z } from "zod";

export type UserInsert = z.output<typeof UserInsertSchema>;

export type UserCommandInput = UserInsert;
