import type { PaginationInput } from "@/lib/validation/pagination";
import type { I18n } from "@/lib/i18n/i18n";
import type { EnableStatus } from "@/lib/validation/enable-status";
import type {
  CategoryInsert as CategoryInsertInput,
  CategoryUpdate as CategoryUpdateInput,
} from "./schema";

/** 分类写入契约；与数据库持久化字段分开定义。 */
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

/** 分类列表和树节点的稳定读取模型。 */
export type CategoryListItem = CategoryRecord & { deepPath: number };
