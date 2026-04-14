import { MenuEntity } from "@/packages/trpc/api/modules/menu/types/menu.entity";

export type MenuEntityTree = MenuEntity & {
  children?: MenuEntityTree[];
};
