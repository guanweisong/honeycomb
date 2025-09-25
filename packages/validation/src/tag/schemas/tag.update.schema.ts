import { createUpdateSchema } from "drizzle-zod";
import { tag } from "@honeycomb/db/src/schema";

export const TagUpdateSchema = createUpdateSchema(tag)
  .pick({
    id: true,
    name: true,
  })
  .required({ id: true, name: true });
