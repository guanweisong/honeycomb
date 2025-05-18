import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { TitleSchema } from "./fields/title.schema";
import { ContentSchema } from "./fields/content.schema";
import { StatusSchema } from "./fields/status.schema";
import { z } from "zod";

export const PageListQuerySchema = PaginationQuerySchema.extend({
  title: TitleSchema.optional(),
  content: ContentSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
});
