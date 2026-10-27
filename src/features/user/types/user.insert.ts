import type { UserInsertSchema } from "@/features/user/schemas/user.write.schema";
import type { z } from "zod";

export type UserInsert = z.output<typeof UserInsertSchema>;

export type UserCommandInput = UserInsert;
