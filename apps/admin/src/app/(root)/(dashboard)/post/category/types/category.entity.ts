import type { BaseEntity } from "@/src/types/BaseEntity";
import type { EnableType } from "@/src/types/EnableType";
import { MultiLang } from "@/src/types/MulitLang";

export interface CategoryEntity extends BaseEntity {
  id: string;
  title: MultiLang;
  path: string;
  parent?: string;
  description?: MultiLang;
  status: EnableType;
  createdAt: string;
  updatedAt: string;
  deepPath: number;
}
