import type { MenuType } from "@/packages/domain/navigation/menu";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";
export type MenuInput = Array<{ id: string; type: MenuType; parent?: string | null; power: number }>;
export type MenuVisibility = "PUBLIC_ONLY" | "ALL";
export interface MenuItem {
  [key: string]: unknown;
  id: string;
  parent: string | null;
  power: number;
  type: string;
  createdAt: string | null;
  updatedAt: string | null;
  title?: MultiLang | null;
  path?: string | null;
}
export interface MenuRepository {
  saveAll(input: MenuInput): Promise<{ count: number }>;
  list(visibility: MenuVisibility): Promise<{ list: MenuItem[]; total: number }>;
}
