import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { PageInsertSchema } from "@honeycomb/validation/page/schemas/page.insert.schema";

export const PageListQuerySchema = PaginationQuerySchema.extend({
  title: PageInsertSchema.shape.title.optional(),
  content: PageInsertSchema.shape.content.optional(),
  status: PageInsertSchema.shape.status.optional(),
});
