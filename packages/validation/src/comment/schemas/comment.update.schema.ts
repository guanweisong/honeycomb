import { createUpdateSchema } from "drizzle-zod";
import { comment } from "@honeycomb/db/src/schema";

export const CommentUpdateSchema = createUpdateSchema(comment)
  .pick({
    id: true,
    status: true,
  })
  .required({
    id: true,
    status: true,
  });
