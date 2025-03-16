import { PaginationQuerySchema } from "@/schemas/pagination.query.schema";
import { TitleSchema } from "@/app/category/schemas/fields/title.schema";
import { PathSchema } from "@/app/category/schemas/fields/path.schema";
import { StatusSchema } from "@/app/category/schemas/fields/status.schema";
import { IdSchema } from "@/schemas/fields/id.schema";
import { z } from "zod";

export const CategoryListQuerySchema = PaginationQuerySchema.extend({
  id: IdSchema.optional(),
  title: TitleSchema.optional(),
  path: PathSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
});
