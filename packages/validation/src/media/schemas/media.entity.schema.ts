import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { media } from "@honeycomb/db/src/schema";

export const MediaEntitySchema = createSelectSchema(media);

export type MediaEntity = CleanZod<typeof MediaEntitySchema>;
