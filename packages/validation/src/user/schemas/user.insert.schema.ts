import { user } from "@honeycomb/db/src/schema";
import { createInsertSchema } from "drizzle-zod";

export const UserInsertSchema = createInsertSchema(user).pick({
  name: true,
  email: true,
  status: true,
  level: true,
  password: true,
});
