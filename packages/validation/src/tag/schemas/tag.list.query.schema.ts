import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { TagUpdateSchema } from "@honeycomb/validation/tag/schemas/tag.update.schema";

export const TagListQuerySchema = PaginationQuerySchema.extend({
  name: TagUpdateSchema.shape.name.optional(),
});
