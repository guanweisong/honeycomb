import { PaginationQuerySchema } from "@honeycomb/validation/schemas/pagination.query.schema";
import { TagEntitySchema } from "@honeycomb/validation/tag/schemas/tag.entity.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

export const TagListQuerySchema = PaginationQuerySchema.extend({
  name: TagEntitySchema.shape.name.optional(),
});

export type TagListQueryInput = CleanZod<typeof TagListQuerySchema>;
