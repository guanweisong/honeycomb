import { createInsertSchema } from "drizzle-zod";
import { page } from "@honeycomb/db/src/schema";

export const PageInsertSchema = createInsertSchema(page).pick({
  title: true,
  content: true,
  status: true,
});
