import type { I18n } from "@/packages/domain/localization/i18n";

/** 分类写入契约；具体数据库字段由 infrastructure 适配器负责映射。 */
export type CategoryInsert = {
  title: I18n;
  description: I18n;
  path: string;
  id?: string;
  parent?: string | null;
  status?: string;
};
export type CategoryUpdate = { id: string } & Partial<Omit<CategoryInsert, "id">>;
export type CategoryListInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  id?: string;
  title?: string;
  status?: string;
};
export type CategoryVisibility = "PUBLIC_ONLY" | "ALL";
export type CategoryNode = { id: string; parent: string | null; path: string; status: string };
export type CategoryRecord = {
  id: string;
  title: I18n | null;
  description: I18n | null;
  parent: string | null;
  path: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export interface CategoryRepository {
  create(input: CategoryInsert): Promise<CategoryRecord>;
  find(id: string): Promise<CategoryNode | null>;
  pathExists(path: string, excludeId?: string): Promise<boolean>;
  update(input: CategoryUpdate): Promise<CategoryRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: CategoryListInput, visibility: CategoryVisibility): Promise<{
    list: (CategoryRecord & { deepPath: number })[];
    total: number;
  }>;
}
