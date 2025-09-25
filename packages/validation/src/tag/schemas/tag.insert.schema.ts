import { tag } from "@honeycomb/db/src/schema";
import { createInsertSchema } from "drizzle-zod";

export const TagInsertSchema = createInsertSchema(tag).pick({
  name: true,
});
