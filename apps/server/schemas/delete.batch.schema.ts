import { IdSchema } from "@/schemas/fields/id.schema";
import { z } from "zod";

export const DeleteBatchSchema = z.object({
  ids: IdSchema.array(),
});
