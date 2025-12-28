import { MenuEntity } from "@/packages/trpc/server/types/menu.entity";

export type MenuEntityTree = MenuEntity & {
  children?: MenuEntityTree[];
};
