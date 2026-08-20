/* eslint-disable @typescript-eslint/no-explicit-any -- DTO 字段由传输层 schema 约束。 */
/** 分类写入契约；具体数据库字段由 infrastructure 适配器负责映射。 */
export type CategoryInsert = {
  title: { zh: string; en: string };
  description: { zh: string; en: string };
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
  sortOrder?: string;
  id?: string;
  title?: string;
  status?: string;
};
export type CategoryVisibility = "PUBLIC_ONLY" | "ALL";
export type CategoryRecord = Record<string, any> & {
  id: string;
  title?: { zh: string; en: string } | null;
  description?: { zh: string; en: string } | null;
  path?: string;
  status?: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export interface CategoryRepository {
  create(input: CategoryInsert): Promise<CategoryRecord>;
  update(input: CategoryUpdate): Promise<CategoryRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(input: CategoryListInput, visibility: CategoryVisibility): Promise<{
    list: (CategoryRecord & { deepPath: number })[];
    total: number;
  }>;
}
