import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { LinkInsertSchema } from "@honeycomb/validation/link/schemas/link.insert.schema";

export const LinkListQuerySchema = PaginationQuerySchema.extend({
  name: LinkInsertSchema.shape.name,
  url: LinkInsertSchema.shape.url,
  description: LinkInsertSchema.shape.description,
  status: LinkInsertSchema.shape.status,
});
