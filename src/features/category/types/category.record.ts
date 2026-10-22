import type { I18n } from "@/lib/i18n/i18n";
import type { EnableStatus } from "@/lib/validation/enable-status";

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
