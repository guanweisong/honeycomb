import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { TitleSchema } from "./fields/title.schema";
import { ContentSchema } from "./fields/content.schema";
import { StatusSchema } from "./fields/status.schema";
import { TypeSchema } from "./fields/type.schema";
import { IdSchema } from "../../schemas/fields/id.schema";
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
