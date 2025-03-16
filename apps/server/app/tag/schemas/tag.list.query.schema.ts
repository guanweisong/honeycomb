import { PaginationQuerySchema } from "@/schemas/pagination.query.schema";
import { NameSchema } from "@/app/tag/schemas/fields/name.schema";

export const TagListQuerySchema = PaginationQuerySchema.extend({
  name: NameSchema.optional(),
});
