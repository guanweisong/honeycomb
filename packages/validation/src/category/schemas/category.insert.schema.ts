import { createInsertSchema } from "drizzle-zod";
import { category } from "@honeycomb/db/src/schema";

export const CategoryInsertSchema = createInsertSchema(category).pick({
  title: true,
  description: true,
  parent: true,
  status: true,
  path: true,
});
