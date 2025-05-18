import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { IdSchema } from "../../schemas/fields/id.schema";
import { ContentSchema } from "./fields/content.schema";

export const TokenListQuerySchema = PaginationQuerySchema.extend({
  userId: IdSchema.optional(),
  content: ContentSchema.optional(),
});
