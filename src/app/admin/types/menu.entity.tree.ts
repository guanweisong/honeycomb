import { MenuEntity } from "@/packages/trpc/server/modules/menu/types/menu.entity";

export type MenuEntityTree = MenuEntity & {
  children?: MenuEntityTree[];
};
