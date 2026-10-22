import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";

export const MediaListQuerySchema = PaginationQuerySchema.partial();
export const MediaRegisterUploadSchema = z.object({
  intent: z.string().min(1),
});
export const MediaIdSchema = z.object({ id: IdSchema });
export const MediaDeleteSchema = DeleteBatchSchema.extend({
  acknowledgeUnknownReferences: z.literal(true),
});

/** 媒体读模型，明确脱离数据库表结构。 */
export const MediaRecordSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string(),
  color: z.string().nullable(),
  height: z.number().nullable(),
  width: z.number().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
