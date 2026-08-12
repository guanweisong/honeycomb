"use client";

import { useEffect, useState } from "react";
import type { MenuType } from "@/packages/domain/navigation/menu";
import {
  flattenMenuTree,
  formatMenuTree,
  getCheckedMenuList,
  isMenuSelected,
  isMenuSelectionDisabled,
  toggleMenuSelection,
  type MenuSelectableItem,
  type CheckedMenuData,
  type MenuEntityTree,
  type SortableMenuNode,
} from "./menuTransforms";

export type MenuTreeEditor = {
  checkedList: MenuEntityTree[];
  menuTree: SortableMenuNode[];
  onCheck: (
    item: MenuSelectableItem,
    checked: boolean,
    type: MenuType,
  ) => void;
  onDragEnd: (treeData: SortableMenuNode[]) => void;
  getCheckedStatus: (item: MenuSelectableItem) => boolean;
  getDisabledStatus: (item: MenuSelectableItem) => boolean;
};

export function useMenuTreeEditor(
  checkedData: CheckedMenuData | undefined,
): MenuTreeEditor {
  const [checkedList, setCheckedList] = useState<MenuEntityTree[]>([]);

  useEffect(() => {
    setCheckedList(getCheckedMenuList(checkedData));
  }, [checkedData]);

  return {
    checkedList,
    menuTree: formatMenuTree(checkedList),
    onCheck: (item, checked, type) => {
      setCheckedList((current) =>
        toggleMenuSelection(current, item, checked, type),
      );
    },
    onDragEnd: (treeData) => setCheckedList(flattenMenuTree(treeData)),
    getCheckedStatus: (item) => isMenuSelected(checkedList, item),
    getDisabledStatus: (item) =>
      isMenuSelectionDisabled(checkedList, item),
  };
}
