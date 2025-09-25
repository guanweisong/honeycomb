import { createInsertSchema } from "drizzle-zod";
import { link } from "@honeycomb/db/src/schema";

export const LinkInsertSchema = createInsertSchema(link).pick({
  url: true,
  status: true,
  name: true,
  description: true,
  logo: true,
});
