import type { BaseEntity } from "@/src/types/BaseEntity";
import { MultiLang } from "@/src/types/MulitLang";
import type { MenuType } from "./MenuType";

export interface MenuEntity extends BaseEntity {
  id: string;
  power: number;
  type: MenuType;
  title: MultiLang;
  path?: string;
  parent?: string;
}
