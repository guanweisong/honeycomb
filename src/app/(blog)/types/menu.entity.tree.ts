import type { MenuItem as MenuEntity } from "@/features/menu/types";

export type MenuEntityTree = MenuEntity & {
  children?: MenuEntityTree[];
};
