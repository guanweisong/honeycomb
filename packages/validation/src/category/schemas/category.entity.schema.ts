import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { category } from "@honeycomb/db/src/schema";

export const CategoryEntitySchema = createSelectSchema(category);

export type CategoryEntity = CleanZod<typeof CategoryEntitySchema>;
