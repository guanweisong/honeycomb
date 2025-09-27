import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { link } from "@honeycomb/db/src/schema";

export const LinkEntitySchema = createSelectSchema(link);

export type LinkEntity = CleanZod<typeof LinkEntitySchema>;
