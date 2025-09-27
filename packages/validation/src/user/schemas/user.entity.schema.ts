import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { user } from "@honeycomb/db/src/schema";

export const UserEntitySchema = createSelectSchema(user);

export type UserEntity = CleanZod<typeof UserEntitySchema>;
