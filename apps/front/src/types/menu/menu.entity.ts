import { MenuType } from "@/types/menu/MenuType";
import { MultiLang } from "@/types/Language";

export interface MenuEntity {
  id: string;
  title?: MultiLang;
  path: string;
  parent?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
  isHome?: boolean;
  type?: MenuType;
  power?: number;
  url?: string;
  children: MenuEntity[];
}
