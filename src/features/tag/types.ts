import type { PaginationInput } from "@/lib/validation/pagination";
import { z } from "zod";
import { NullableI18nSchema } from "@/lib/i18n/i18n";
import type {
  TagInsert as TagInsertInput,
  TagUpdate as TagUpdateInput,
} from "./schema";

export type TagInsert = TagInsertInput & { id?: string };
export type TagUpdate = TagUpdateInput;
export type TagListInput = PaginationInput & {
  id?: string[];
  name?: string;
};
export const TagRecordSchema = z.object({
  id: z.string(),
  name: NullableI18nSchema,
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export type TagRecord = z.infer<typeof TagRecordSchema>;
