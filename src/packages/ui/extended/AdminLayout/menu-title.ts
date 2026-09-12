import type { MenuItem } from "../Menu";

/** 解析当前管理路由最具体的菜单标题。 */
export function findMenuTitle(
  items: readonly MenuItem[],
  pathname: string,
): string | undefined {
  for (const item of items) {
    if (pathname === item.path) return item.name;

    if (item.children) {
      const childTitle = findMenuTitle(item.children, pathname);
      if (childTitle) return childTitle;
    }

    if (pathname.startsWith(`${item.path}/`)) return item.name;
  }

  return undefined;
}
