import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { LinkInsertSchema } from "@honeycomb/validation/link/schemas/link.insert.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";
import { z } from "zod";

export const LinkListQuerySchema = PaginationQuerySchema.extend({
  name: LinkInsertSchema.shape.name,
  url: LinkInsertSchema.shape.url,
  description: LinkInsertSchema.shape.description,
  status: LinkInsertSchema.shape.status,
}).extend({
  status: z.array(z.string()).optional(),
});

export type LinkListQueryInput = CleanZod<typeof LinkListQuerySchema>;
