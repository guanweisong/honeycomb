import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { TagNameSchema } from "./fields/tag.name.schema";

export const TagListQuerySchema = PaginationQuerySchema.extend({
  name: TagNameSchema.optional(),
});
