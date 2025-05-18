import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { LinkNameSchema } from "./fields/link.name.schema";
import { UrlSchema } from "../../schemas/fields/url.schema";
import { DescriptionSchema } from "./fields/description.schema";
import { StatusSchema } from "./fields/status.schema";
import { z } from "zod";

export const LinkListQuerySchema = PaginationQuerySchema.extend({
  name: LinkNameSchema.optional(),
  url: UrlSchema.optional(),
  description: DescriptionSchema.optional(),
  status: z.union([StatusSchema.array(), StatusSchema]).optional(),
});
