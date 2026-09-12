import type { MenuType } from "@/packages/domain/navigation/menu";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";
export type { MenuInput } from "./write-schema";
import type { MenuInput } from "./write-schema";
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
export interface MenuRepository {
  saveAll(input: MenuInput): Promise<{ count: number }>;
  list(visibility: MenuVisibility): Promise<{ list: MenuItem[]; total: number }>;
}
