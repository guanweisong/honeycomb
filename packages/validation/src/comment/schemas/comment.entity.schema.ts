import { createSelectSchema } from "drizzle-zod";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { comment } from "@honeycomb/db/src/schema";

export const CommentEntitySchema = createSelectSchema(comment);

export type CommentEntity = CleanZod<typeof CommentEntitySchema>;
