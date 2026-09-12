import {
  getFlatDataFromTree,
  getTreeFromFlatData,
} from "@nosferatu500/react-sortable-tree";
import { MenuType, MenuTypeName } from "@/packages/domain/navigation/menu";
import type { MultiLang } from "@/packages/domain/localization/multi-lang";

export type MenuEntityTree = {
  id: string;
  parent: string | null;
  power: number;
  type: MenuType;
  createdAt: string | null;
  updatedAt: string | null;
  title?: MultiLang | string | null;
  path?: string | null;
  children?: MenuEntityTree[];
};

export type SortableMenuNode = Omit<MenuEntityTree, "title" | "children"> & {
  title: string;
  subtitle: string;
  expanded: boolean;
  children?: SortableMenuNode[];
};

export type MenuSelectableItem = {
  id: string;
  title?: MultiLang | null;
  path?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MenuSaveItem = {
  id: string;
  type: MenuType;
  power: number;
  parent?: string;
};

export type CheckedMenuData = {
  list?: MenuEntityTree[];
};

export function getCheckedMenuList(
  checkedData: CheckedMenuData | undefined,
): MenuEntityTree[] {
  return checkedData?.list ?? [];
}

export function toggleMenuSelection(
  checkedList: MenuEntityTree[],
  item: MenuSelectableItem,
  checked: boolean,
  type: MenuType,
): MenuEntityTree[] {
  if (!checked) {
    return checkedList.filter((menu) => menu.id !== item.id);
  }

  return [
    ...checkedList,
    {
      id: item.id,
      title: item.title ?? null,
      path: "path" in item ? (item.path ?? null) : null,
      parent: null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      power: checkedList.length,
      type,
    },
  ];
}

export function isMenuSelected(
  checkedList: MenuEntityTree[],
  item: MenuSelectableItem,
): boolean {
  return checkedList.some((menu) => menu.id === item.id);
}

export function isMenuSelectionDisabled(
  checkedList: MenuEntityTree[],
  item: MenuSelectableItem,
): boolean {
  return checkedList.some((menu) => menu.parent === item.id);
}

export function formatMenuTree(
  checkedList: MenuEntityTree[],
): SortableMenuNode[] {
  const flatData: SortableMenuNode[] = checkedList.map((item) => ({
    id: item.id,
    parent: item.parent,
    power: item.power,
    type: item.type,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    path: item.path,
    title: typeof item.title === "string" ? item.title : (item.title?.zh ?? ""),
    subtitle: MenuTypeName[item.type],
    expanded: true,
  }));

  return getTreeFromFlatData<SortableMenuNode>({
    flatData,
    getKey: (node) => node.id,
    getParentKey: (node) => node.parent,
    rootKey: null,
  });
}

export function flattenMenuTree(
  treeData: SortableMenuNode[],
): MenuEntityTree[] {
  const listData = getFlatDataFromTree<SortableMenuNode>({
    treeData,
    getNodeKey: ({ node }) => node.id,
    ignoreCollapsed: false,
  });

  return listData.map(({ node, parentNode }) => ({
    id: node.id,
    parent: parentNode?.id ?? null,
    power: node.power,
    type: node.type,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    title: node.title,
    path: node.path,
  }));
}

export function buildMenuSaveInput(
  checkedList: MenuEntityTree[],
): MenuSaveItem[] {
  return checkedList.map((item, power) => ({
    id: item.id,
    type: item.type,
    power,
    ...(item.parent ? { parent: item.parent } : {}),
  }));
}
/**
 * 菜单树选择、扁平化、格式化和保存输入转换函数。
 */
