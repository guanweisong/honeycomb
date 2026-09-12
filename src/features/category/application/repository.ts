import type { PaginationInput } from "@/packages/application/pagination";
import type { I18n } from "@/packages/domain/localization/i18n";
import type { EnableStatus } from "@/packages/domain/shared/enable-status";
import type {
  CategoryInsert as CategoryInsertInput,
  CategoryUpdate as CategoryUpdateInput,
} from "./write-schema";

/** 分类写入契约；具体数据库字段由 infrastructure 适配器负责映射。 */
export type CategoryInsert = CategoryInsertInput & { id?: string };
export type CategoryUpdate = CategoryUpdateInput;
export type CategoryListInput = PaginationInput & {
  id?: string;
  title?: string;
  status?: EnableStatus;
};
export type CategoryVisibility = "PUBLIC_ONLY" | "ALL";
export type CategoryNode = {
  id: string;
  parent: string | null;
  path: string;
  status: EnableStatus;
};
export type CategoryRecord = {
  id: string;
  title: I18n | null;
  description: I18n | null;
  parent: string | null;
  path: string;
  status: EnableStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export interface CategoryRepository {
  tree(visibility: CategoryVisibility): Promise<{
    list: (CategoryRecord & { deepPath: number })[];
    total: number;
  }>;
  create(input: CategoryInsert): Promise<CategoryRecord>;
  find(id: string): Promise<CategoryNode | null>;
  pathExists(path: string, excludeId?: string): Promise<boolean>;
  update(input: CategoryUpdate): Promise<CategoryRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
  list(
    input: CategoryListInput,
    visibility: CategoryVisibility,
  ): Promise<{
    list: (CategoryRecord & { deepPath: number })[];
    total: number;
  }>;
}
