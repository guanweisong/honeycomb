import { createUpdateSchema } from "drizzle-zod";
import { user } from "@honeycomb/db/src/schema";

export const UserListQuerySchema = createUpdateSchema(user).pick({
  name: true,
  email: true,
  status: true,
  level: true,
});
