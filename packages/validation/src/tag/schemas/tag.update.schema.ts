import { tag } from "@honeycomb/db/src/schema";
import { createUpdateSchema } from "drizzle-zod";

export const TagUpdateSchema = createUpdateSchema(tag)
  .pick({
    id: true,
    name: true,
  })
  .required({
    id: true,
    name: true,
  });
