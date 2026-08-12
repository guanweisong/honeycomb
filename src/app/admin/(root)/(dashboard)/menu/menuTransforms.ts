import {
  getFlatDataFromTree,
  getTreeFromFlatData,
} from "@nosferatu500/react-sortable-tree";
import {
  MenuType,
  MenuTypeName,
} from "@/packages/domain/navigation/menu";

export type MenuEntityTree = {
  id: string;
  parent: string | null;
  power: number;
  type: string;
  createdAt: string | null;
  updatedAt: string | null;
  title?: { en?: string; zh?: string } | string | null;
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
  title?: { en?: string; zh?: string } | null;
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
    } as MenuEntityTree,
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
  const flatData = checkedList.map((item) => ({
    ...item,
    title:
      typeof item.title === "string" ? item.title : (item.title?.zh ?? ""),
    subtitle: MenuTypeName[item.type as MenuType],
    expanded: true,
  }));

  return getTreeFromFlatData({
    flatData,
    getKey: (node: { id: string }) => node.id,
    getParentKey: (node: { parent: string | null }) => node.parent,
    rootKey: null,
  }) as SortableMenuNode[];
}

export function flattenMenuTree(
  treeData: SortableMenuNode[],
): MenuEntityTree[] {
  const listData = getFlatDataFromTree({
    treeData,
    getNodeKey: ({ node }: { node: MenuEntityTree }) => node.id,
    ignoreCollapsed: false,
  }) as { node: MenuEntityTree; parentNode: MenuEntityTree | null }[];

  return listData.map(({ node, parentNode }) => ({
    ...node,
    parent: parentNode?.id ?? null,
  }));
}

export function buildMenuSaveInput(
  checkedList: MenuEntityTree[],
): MenuSaveItem[] {
  return checkedList.map((item, power) => ({
    id: item.id,
    type: item.type as MenuType,
    power,
    ...(item.parent ? { parent: item.parent } : {}),
  }));
}
