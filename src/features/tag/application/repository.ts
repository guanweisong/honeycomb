import type { I18n } from "@/packages/domain/localization/i18n";

export interface TagInsert { name: I18n; id?: string }
export type TagUpdate = { id: string } & Partial<TagInsert>;
export type TagListInput = Record<string, string | number | boolean | Array<string | number | boolean> | undefined> & {
  page?: number; limit?: number; sortField?: string; sortOrder?: "asc" | "desc"; name?: string;
};
export interface TagRecord { id: string; name: I18n | null; createdAt: string | null; updatedAt: string | null }
export interface TagRepository {
  create(input: TagInsert): Promise<TagRecord>;
  update(input: TagUpdate): Promise<TagRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: TagListInput): Promise<{ list: TagRecord[]; total: number }>;
}
