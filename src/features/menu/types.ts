import type { MenuType } from "@/features/menu/menu-types";
import type { MultiLang } from "@/lib/i18n/multi-lang";

export type { MenuInput } from "./schema";
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
