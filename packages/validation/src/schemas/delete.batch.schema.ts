import { IdSchema } from "./fields/id.schema";
import { z } from "zod";

export const DeleteBatchSchema = z.object({
  ids: IdSchema.array(),
});
