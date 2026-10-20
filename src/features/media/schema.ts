import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import type { CleanZod } from "@/lib/validation/validation";

export const MediaListQuerySchema = PaginationQuerySchema.partial();
export const MediaRegisterUploadSchema = z.object({
  intent: z.string().min(1),
});
export const MediaIdSchema = z.object({ id: IdSchema });
export const MediaDeleteSchema = DeleteBatchSchema.extend({
  acknowledgeUnknownReferences: z.literal(true),
});
export type MediaIndexInput = CleanZod<typeof MediaListQuerySchema>;
