import { describe, expect, it } from "vitest";
import { MenuType } from "@/packages/domain/navigation/menu";
import {
  buildMenuSaveInput,
  flattenMenuTree,
  formatMenuTree,
  getCheckedMenuList,
  isMenuSelectionDisabled,
  isMenuSelected,
  toggleMenuSelection,
  type MenuEntityTree,
  type MenuSelectableItem,
} from "./menu-transforms";

const createdAt = "2026-01-02T03:04:05.000Z";

const categoryMenu = {
  id: "category-1",
  title: { en: "Category", zh: "分类" },
  path: "/category",
  parent: null,
  createdAt,
  updatedAt: null,
  power: 0,
  type: MenuType.CATEGORY,
} as MenuEntityTree;

const pageMenu = {
  id: "page-1",
  title: "关于",
  path: null,
  parent: "category-1",
  createdAt,
  updatedAt: null,
  power: 1,
  type: MenuType.PAGE,
} as MenuEntityTree;

describe("menu transforms", () => {
  it("syncs the checked list from the admin menu query response", () => {
    expect(getCheckedMenuList(undefined)).toEqual([]);
    expect(getCheckedMenuList({ list: [categoryMenu] })).toEqual([
      categoryMenu,
    ]);
  });

  it("formats flat menu rows as an expanded localized tree", () => {
    expect(formatMenuTree([categoryMenu, pageMenu])).toEqual([
      {
        ...categoryMenu,
        title: "分类",
        subtitle: "分类",
        expanded: true,
        children: [
          {
            ...pageMenu,
            title: "关于",
            subtitle: "页面",
            expanded: true,
          },
        ],
      },
    ]);
  });

  it("flattens a dragged tree and derives parents from its structure", () => {
    const draggedTree = formatMenuTree([
      { ...categoryMenu, parent: "page-1" },
      { ...pageMenu, parent: null },
    ]);

    expect(flattenMenuTree(draggedTree)).toEqual([
      expect.objectContaining({ id: "page-1", parent: null }),
      expect.objectContaining({ id: "category-1", parent: "page-1" }),
    ]);
  });

  it("builds the saveAll payload in visible order and omits root parents", () => {
    expect(buildMenuSaveInput([pageMenu, categoryMenu])).toEqual([
      {
        id: "page-1",
        type: MenuType.PAGE,
        power: 0,
        parent: "category-1",
      },
      {
        id: "category-1",
        type: MenuType.CATEGORY,
        power: 1,
      },
    ]);
  });

  it("adds and removes selectable items without mutating the checked list", () => {
    const selectablePage = {
      id: "page-2",
      title: { en: "Contact", zh: "联系" },
      createdAt,
      updatedAt: null,
    } satisfies MenuSelectableItem;

    const added = toggleMenuSelection(
      [categoryMenu],
      selectablePage,
      true,
      MenuType.PAGE,
    );

    expect(added).toEqual([
      categoryMenu,
      {
        id: "page-2",
        title: selectablePage.title,
        path: null,
        parent: null,
        createdAt,
        updatedAt: null,
        power: 1,
        type: MenuType.PAGE,
      },
    ]);
    expect(toggleMenuSelection(added, selectablePage, false, MenuType.PAGE)).toEqual([
      categoryMenu,
    ]);
    expect(isMenuSelected(added, selectablePage)).toBe(true);
  });

  it("disables removing a selected item that still owns a child", () => {
    const category = {
      id: categoryMenu.id,
      title: categoryMenu.title as { en: string; zh: string },
      path: categoryMenu.path,
      createdAt,
      updatedAt: null,
    } satisfies MenuSelectableItem;
    const page = {
      id: pageMenu.id,
      title: { en: "About", zh: "关于" },
      createdAt,
      updatedAt: null,
    } satisfies MenuSelectableItem;

    expect(isMenuSelectionDisabled([categoryMenu, pageMenu], category)).toBe(
      true,
    );
    expect(isMenuSelectionDisabled([categoryMenu, pageMenu], page)).toBe(false);
  });
});
