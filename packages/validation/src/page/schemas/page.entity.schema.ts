import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { page } from "@honeycomb/db/src/schema";

export const PageEntitySchema = createSelectSchema(page);

export type PageEntity = CleanZod<typeof PageEntitySchema>;
