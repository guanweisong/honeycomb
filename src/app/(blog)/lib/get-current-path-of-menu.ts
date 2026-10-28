import type { MenuNavigationItem } from "@/app/(blog)/types/menu-navigation-item";

interface GetCurrentPathProps {
  id?: string;
  menu: MenuNavigationItem[];
}

/** 从根到当前菜单项收集路径，跳过空路径并在缺失父项或环处停止。 */
export default function getCurrentPathOfMenu({
  id,
  menu,
}: GetCurrentPathProps) {
  const path: string[] = [];
  const byId = new Map(menu.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let current = id ? byId.get(id) : undefined;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (typeof current.path === "string") path.push(current.path);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return path.reverse();
}
