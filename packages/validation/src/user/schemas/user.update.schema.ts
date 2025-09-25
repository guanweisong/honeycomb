import { createInsertSchema } from "drizzle-zod";
import { user } from "@honeycomb/db/src/schema";

export const UserUpdateSchema = createInsertSchema(user)
  .pick({
    id: true,
    name: true,
    email: true,
    status: true,
    level: true,
    password: true,
  })
  .required({ id: true });
