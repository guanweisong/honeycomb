import { createUpdateSchema } from "drizzle-zod";
import { user } from "@honeycomb/db/src/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

export const UserListQuerySchema = createUpdateSchema(user).pick({
  name: true,
  email: true,
  status: true,
  level: true,
});

export type UserListQueryInput = CleanZod<typeof UserListQuerySchema>;
