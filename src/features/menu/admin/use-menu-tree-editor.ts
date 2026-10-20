"use client";

import { useEffect, useState } from "react";
import type { MenuType } from "@/features/menu/menu-types";
import {
  buildMenuSaveInput,
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
} from "./menu-transforms";

const fingerprint = (rows: MenuEntityTree[]) =>
  JSON.stringify(buildMenuSaveInput(rows));
export type MenuTreeEditor = {
  checkedList: MenuEntityTree[];
  menuTree: SortableMenuNode[];
  baseVersion: number | undefined;
  dirty: boolean;
  setProtected: (value: boolean) => void;
  removeBranch: (id: string) => void;
  acknowledge: (submitted: MenuEntityTree[], version: number) => void;
  acceptLatest: (snapshot: CheckedMenuData, keepLocal: boolean) => void;
  onCheck: (item: MenuSelectableItem, checked: boolean, type: MenuType) => void;
  onDragEnd: (treeData: SortableMenuNode[]) => void;
  getCheckedStatus: (item: MenuSelectableItem) => boolean;
  getDisabledStatus: (item: MenuSelectableItem) => boolean;
};

export function useMenuTreeEditor(
  checkedData: CheckedMenuData | undefined,
): MenuTreeEditor {
  const [protectedSnapshot, setProtected] = useState(false);
  const [checkedList, setCheckedList] = useState<MenuEntityTree[]>([]);
  const [baseline, setBaseline] = useState({
    rows: [] as MenuEntityTree[],
    version: undefined as number | undefined,
  });
  const dirty = fingerprint(checkedList) !== fingerprint(baseline.rows);
  useEffect(() => {
    if (
      !checkedData ||
      protectedSnapshot ||
      dirty ||
      (baseline.version !== undefined &&
        (checkedData.version ?? -1) < baseline.version)
    )
      return;
    const rows = getCheckedMenuList(checkedData);
    setCheckedList(rows);
    setBaseline({ rows, version: checkedData.version });
  }, [checkedData, dirty, baseline.version, protectedSnapshot]);

  return {
    checkedList,
    menuTree: formatMenuTree(checkedList),
    baseVersion: baseline.version,
    dirty,
    setProtected,
    removeBranch: (id) =>
      setCheckedList((current) => {
        const removed = new Set([id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const item of current)
            if (
              item.parent &&
              removed.has(item.parent) &&
              !removed.has(item.id)
            ) {
              removed.add(item.id);
              changed = true;
            }
        }
        return current.filter((item) => !removed.has(item.id));
      }),
    acknowledge: (submitted, version) =>
      setBaseline({ rows: submitted, version }),
    acceptLatest: (snapshot, keepLocal) => {
      const rows = getCheckedMenuList(snapshot);
      setBaseline({ rows, version: snapshot.version });
      if (!keepLocal) setCheckedList(rows);
    },
    onCheck: (item, checked, type) =>
      setCheckedList((current) =>
        toggleMenuSelection(current, item, checked, type),
      ),
    onDragEnd: (treeData) => setCheckedList(flattenMenuTree(treeData)),
    getCheckedStatus: (item) => isMenuSelected(checkedList, item),
    getDisabledStatus: (item) => isMenuSelectionDisabled(checkedList, item),
  };
}
