import { z } from "zod";
import { IdSchema } from "@/schemas/fields/id.schema";
import { ContentSchema } from "@/app/token/schemas/fields/content.schema";

export const TokenCreateSchema = z.object({
  userId: IdSchema,
  content: ContentSchema,
});
