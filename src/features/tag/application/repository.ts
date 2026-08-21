import type { MultiLang } from "@/packages/domain/localization/multi-lang";

export interface TagInsert { name: MultiLang; id?: string }
export type TagUpdate = { id: string } & Partial<TagInsert>;
export type TagListInput = Record<string, string | number | boolean | Array<string | number | boolean> | undefined> & {
  page?: number; limit?: number; sortField?: string; sortOrder?: string; name?: string;
};
export interface TagRecord { id: string; name: MultiLang | null; createdAt: string | null; updatedAt: string | null }
export interface TagRepository {
  create(input: TagInsert): Promise<TagRecord>;
  update(input: TagUpdate): Promise<TagRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: TagListInput): Promise<{ list: TagRecord[]; total: number }>;
}
