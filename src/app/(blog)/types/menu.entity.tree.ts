import type { MenuViewModel as MenuEntity } from "@/features/contracts";

export type MenuEntityTree = MenuEntity & {
  children?: MenuEntityTree[];
};
