import type { PaginationInput } from "@/lib/validation/pagination";
import { z } from "zod";

export type { MediaInsert } from "./schema";

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

export type MediaListInput = PaginationInput;

export interface MediaDeleteTarget {
  id: string;
  key: string;
}
