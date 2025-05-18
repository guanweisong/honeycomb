import { z } from "zod";
import { IdSchema } from "../../schemas/fields/id.schema";
import { ContentSchema } from "./fields/content.schema";

export const TokenCreateSchema = z.object({
  userId: IdSchema,
  content: ContentSchema,
});
