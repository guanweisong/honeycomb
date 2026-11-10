import type { MenuNavigationItem } from "@/app/(blog)/types/menu-navigation-item";

interface GetCurrentPathProps {
  id?: string;
  menu: MenuNavigationItem[];
  pathOf?: (item: MenuNavigationItem) => string | null | undefined;
}

/** 从根到当前菜单项收集路径，跳过空路径并在缺失父项或环处停止。 */
export default function getCurrentPathOfMenu({
  id,
  menu,
  pathOf = (item) => item.path,
}: GetCurrentPathProps) {
  const path: string[] = [];
  const byId = new Map(menu.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let current = id ? byId.get(id) : undefined;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const segment = pathOf(current);
    if (typeof segment === "string") path.push(segment);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return path.reverse();
}
