import { MenuEntity } from "@/packages/trpc/server/types/menu.entity";

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
  familyProp: string;
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
  const path = [] as string[];
  if (id) {
    const find = (data: MenuEntity[]) => {
      /**
       * 递归查找菜单项的父级，并将其指定属性添加到路径数组中。
       * @param {MenuEntity[]} data - 当前层级的菜单数据，用于查找父级。
       */
      if (data.length === 1) {
        // @ts-ignore
        path.push(data[0][familyProp]);
      } else {
        data.forEach((item) => {
          if (item.id === id) {
            // @ts-ignore
            path.push(item[familyProp]);
            if (item.parent !== "0") {
              find(data.filter((m) => m.id === item.parent));
            }
          }
        });
      }
    };
    find(menu);
  }
  return path.reverse();
};

export default getCurrentPathOfMenu;
