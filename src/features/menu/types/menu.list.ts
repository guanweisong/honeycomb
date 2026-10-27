import type { MenuType } from "@/features/menu/types/menu.type";
import type { MultiLang } from "@/lib/i18n/multi-lang";

export type MenuVisibility = "PUBLIC_ONLY" | "ALL";

export interface MenuItem {
  id: string;
  parent: string | null;
  power: number;
  type: MenuType;
  createdAt: string | null;
  updatedAt: string | null;
  title?: MultiLang | null;
  path?: string | null;
}
