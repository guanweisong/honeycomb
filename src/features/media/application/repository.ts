import type { PaginationInput } from "@/packages/application/pagination";
import { z } from "zod";

export type MediaInsert = import("zod").output<
  typeof import("./write-schema").MediaInsertSchema
>;

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

export interface MediaRepository {
  create(input: MediaInsert): Promise<MediaRecord>;
  list(input: MediaListInput): Promise<{ list: MediaRecord[]; total: number }>;
  findDeleteTargets(ids: string[]): Promise<MediaDeleteTarget[]>;
  deleteRecords(ids: string[]): Promise<{ success: true }>;
}
