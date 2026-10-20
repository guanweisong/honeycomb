import type { MenuItem as MenuEntity } from "@/features/menu/types";

/**
 * 获取菜单当前路径属性的属性接口。
 */
export interface GetCurrentPathProps {
  /**
   * 菜单项的 ID。
   */
  id?: string;
  /**
   * 要获取的家族属性名称（例如 "path"）。
   */
  familyProp: keyof MenuEntity;
  /**
   * 菜单数据数组。
   */
  menu: MenuEntity[];
}

/**
 * 根据菜单 ID 寻找其所有父级的指定属性集合。
 * 例如，可以用于获取一个菜单项的完整路径。
 * @param {GetCurrentPathProps} props - 包含菜单 ID、家族属性名和菜单数据的属性。
 * @returns {string[]} 包含所有父级指定属性的数组，从根到当前菜单项。
 */
const getCurrentPathOfMenu = (props: GetCurrentPathProps) => {
  const { id, familyProp, menu } = props;
  const path: string[] = [];
  const byId = new Map(menu.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let current = id ? byId.get(id) : undefined;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const value = current[familyProp];
    if (typeof value === "string") path.push(value);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return path.reverse();
};

export default getCurrentPathOfMenu;
