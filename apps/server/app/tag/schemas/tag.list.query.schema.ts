import { PaginationQuerySchema } from "@/schemas/pagination.query.schema";
import { TagNameSchema } from "@/app/tag/schemas/fields/tag.name.schema";

export const TagListQuerySchema = PaginationQuerySchema.extend({
  name: TagNameSchema.optional(),
});
