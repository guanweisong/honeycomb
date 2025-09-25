import { z } from "zod";
import { IdSchema } from "../../schemas/fields/id.schema";
import { ContentSchema } from "./fields/content.schema";

export const TokenInsertSchema = z.object({
  userId: IdSchema,
  content: ContentSchema,
});
