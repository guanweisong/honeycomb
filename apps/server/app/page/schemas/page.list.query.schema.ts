import { PaginationQuerySchema } from "@/schemas/pagination.query.schema";
import { TitleSchema } from "@/app/page/schemas/fields/title.schema";
import { ContentSchema } from "@/app/page/schemas/fields/content.schema";
import { StatusSchema } from "@/app/page/schemas/fields/status.schema";
import { z } from "zod";

export const PageListQuerySchema = PaginationQuerySchema.extend({
  title: TitleSchema.optional(),
  content: ContentSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
});
