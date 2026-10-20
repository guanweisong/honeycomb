import { MediaStateSchema, MediaErrorCodeSchema } from "./lifecycle";
import type { PaginationInput } from "@/lib/validation/pagination";
import { z } from "zod";

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
export type MediaRecord = z.infer<typeof MediaRecordSchema>;

export const MediaManagementRecordSchema = MediaRecordSchema.extend({
  state: MediaStateSchema,
  verifiedAt: z.string().nullable(),
  lastAttemptAt: z.string().nullable(),
  lastErrorCode: MediaErrorCodeSchema.nullable(),
});
export type MediaManagementRecord = z.infer<typeof MediaManagementRecordSchema>;
export type MediaListInput = PaginationInput & {
  state?: z.infer<typeof MediaStateSchema>;
};
export const MediaConfirmResultSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("ready"), media: MediaRecordSchema }),
  z.object({
    state: z.literal("pending"),
    id: z.string(),
    message: z.string(),
  }),
  z.object({
    state: z.literal("rejected"),
    id: z.string(),
    message: z.string(),
  }),
]);
export type MediaConfirmResult = z.infer<typeof MediaConfirmResultSchema>;
