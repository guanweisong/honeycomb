import type {
  TagInsertSchema,
  TagUpdateSchema,
  TagListQuerySchema,
  TagRecordSchema,
} from "./schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";

export type TagInsert = TagInsertInput & { id?: string };
export type TagListInput = PaginationInput & {
  id?: string[];
  name?: string;
};

export type TagRecord = z.output<typeof TagRecordSchema>;

export type TagInsertInput = z.output<typeof TagInsertSchema>;
export type TagUpdate = z.output<typeof TagUpdateSchema>;
export type TagListQueryInput = z.output<typeof TagListQuerySchema>;
