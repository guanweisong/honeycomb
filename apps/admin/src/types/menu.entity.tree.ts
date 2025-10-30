import { MenuEntity } from "@honeycomb/trpc/server/types/menu.entity";

export type MenuEntityTree = MenuEntity & {
  children?: MenuEntityTree[];
};
