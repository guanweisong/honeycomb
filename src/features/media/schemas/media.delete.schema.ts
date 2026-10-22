import { z } from "zod";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";

export const MediaDeleteSchema = DeleteBatchSchema.extend({
  acknowledgeUnknownReferences: z.literal(true),
});
