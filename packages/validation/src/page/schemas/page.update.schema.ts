import { createUpdateSchema } from "drizzle-zod";
import { page } from "@honeycomb/db/src/schema";

export const PageUpdateSchema = createUpdateSchema(page)
  .pick({
    title: true,
    description: true,
    content: true,
    id: true,
  })
  .required({
    id: true,
  });
