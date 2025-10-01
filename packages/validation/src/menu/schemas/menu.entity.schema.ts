import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { menu } from "@honeycomb/db/src/schema";

export const MenuEntitySchema = createSelectSchema(menu);

export type MenuEntity = CleanZod<typeof MenuEntitySchema>;
