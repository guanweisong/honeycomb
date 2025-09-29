import { createUpdateSchema } from "drizzle-zod";
import { user } from "@honeycomb/db/src/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { z } from "zod";

export const UserListQuerySchema = createUpdateSchema(user)
  .pick({
    name: true,
    email: true,
    status: true,
    level: true,
  })
  .extend({
    status: z.array(z.string()).optional(),
    level: z.array(z.number()).optional(),
  });

export type UserListQueryInput = CleanZod<typeof UserListQuerySchema>;
