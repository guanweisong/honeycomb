import { createUpdateSchema } from "drizzle-zod";
import { category } from "@honeycomb/db/src/schema";

export const CategoryUpdateSchema = createUpdateSchema(category)
  .pick({
    title: true,
    description: true,
    parent: true,
    status: true,
    path: true,
    id: true,
  })
  .required({
    id: true,
  });
