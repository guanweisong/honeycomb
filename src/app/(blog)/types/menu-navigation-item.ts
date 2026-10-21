import type { MenuItem } from "@/features/menu/types";

/** 客户端导航仅接收路径与标题，不包含排序、类型及持久化时间戳。 */
export type MenuNavigationItem = Pick<
  MenuItem,
  "id" | "parent" | "path" | "title"
>;
