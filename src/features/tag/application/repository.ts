import type { PaginationInput } from "@/packages/application/pagination";
import { z } from "zod";
import { NullableI18nSchema } from "@/packages/domain/localization/i18n";
import type {
  TagInsert as TagInsertInput,
  TagUpdate as TagUpdateInput,
} from "./write-schema";

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
export interface TagRepository {
  create(input: TagInsert): Promise<TagRecord>;
  update(input: TagUpdate): Promise<TagRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: TagListInput): Promise<{ list: TagRecord[]; total: number }>;
}
