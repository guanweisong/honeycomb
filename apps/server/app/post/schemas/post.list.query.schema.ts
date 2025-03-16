import { PaginationQuerySchema } from "@/schemas/pagination.query.schema";
import { TitleSchema } from "@/app/post/schemas/fields/title.schema";
import { ContentSchema } from "@/app/post/schemas/fields/content.schema";
import { StatusSchema } from "@/app/post/schemas/fields/status.schema";
import { TypeSchema } from "@/app/post/schemas/fields/type.schema";
import { IdSchema } from "@/schemas/fields/id.schema";
import { z } from "zod";

export const PostListQuerySchema = PaginationQuerySchema.extend({
  title: TitleSchema.optional(),
  content: ContentSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
  type: z.union([TypeSchema.array(), TypeSchema]).optional(),
  categoryId: IdSchema.optional(),
  tagName: z.string().optional(),
  userName: z.string().optional(),
});
