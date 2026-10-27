"use client";

import { useEffect, useState } from "react";
import type { MenuType } from "@/features/menu/types/menu.type";
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
} from "@/features/menu/admin/menu-transforms";

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

/**
 * 菜单整树快照与版本共同构成保存基线；dirty 或保存/核对保护期内不自动接纳查询结果。
 * acknowledge 仅确认已提交快照，acceptLatest 才是用户主动选择新基线的恢复入口。
 */
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
    removeBranch: (id) => {
      if (baseline.version === undefined) return;
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
      });
    },
    acknowledge: (submitted, version) =>
      setBaseline({ rows: submitted, version }),
    acceptLatest: (snapshot, keepLocal) => {
      const rows = getCheckedMenuList(snapshot);
      setBaseline({ rows, version: snapshot.version });
      if (!keepLocal) setCheckedList(rows);
    },
    onCheck: (item, checked, type) => {
      if (baseline.version === undefined) return;
      setCheckedList((current) =>
        toggleMenuSelection(current, item, checked, type),
      );
    },
    onDragEnd: (treeData) => {
      if (baseline.version === undefined) return;
      setCheckedList(flattenMenuTree(treeData));
    },
    getCheckedStatus: (item) => isMenuSelected(checkedList, item),
    getDisabledStatus: (item) =>
      baseline.version === undefined ||
      isMenuSelectionDisabled(checkedList, item),
  };
}
