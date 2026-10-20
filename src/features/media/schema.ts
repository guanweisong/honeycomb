import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import type { CleanZod } from "@/lib/validation/validation";
import { MediaStateSchema } from "./lifecycle";

export const MediaListQuerySchema = PaginationQuerySchema.partial().extend({
  state: MediaStateSchema.optional(),
});
export const MediaIdSchema = z.object({ id: IdSchema });
export const MediaDeleteSchema = DeleteBatchSchema.extend({
  acknowledgeUnknownReferences: z.literal(true),
});
export const MediaReconcileSchema = MediaIdSchema.extend({
  acknowledgeUnknownReferences: z.literal(true).optional(),
});
export type MediaIndexInput = CleanZod<typeof MediaListQuerySchema>;
