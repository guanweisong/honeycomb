import { createSelectSchema } from "drizzle-zod";
import { tag } from "@honeycomb/db/src/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

export const TagEntitySchema = createSelectSchema(tag);

export type TagEntity = CleanZod<typeof TagEntitySchema>;
