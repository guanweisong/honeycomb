import { MenuEntity } from "@/packages/trpc/api/outputs";

export type MenuEntityTree = MenuEntity & {
  children?: MenuEntityTree[];
};
