import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { post } from "@honeycomb/db/src/schema";

export const PostEntitySchema = createSelectSchema(post);

export type PostEntity = CleanZod<typeof PostEntitySchema>;
