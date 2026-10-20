import { z } from "zod";
export const MEDIA_STATES = [
  "UPLOADING",
  "READY",
  "DELETING",
  "DELETED",
] as const;
export const MediaStateSchema = z.enum(MEDIA_STATES);
export type MediaState = z.infer<typeof MediaStateSchema>;
export const MEDIA_ERROR_CODES = [
  "STORAGE_PENDING",
  "INVALID_IMAGE",
  "DATABASE_PENDING",
  "DELETE_PENDING",
] as const;
export const MediaErrorCodeSchema = z.enum(MEDIA_ERROR_CODES);
