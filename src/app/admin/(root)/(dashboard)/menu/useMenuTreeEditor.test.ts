import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";
import {
  useMenuTreeEditor,
  type MenuTreeEditor,
} from "./useMenuTreeEditor";
import type {
  CheckedMenuData,
  MenuEntityTree,
  MenuSelectableItem,
} from "./menuTransforms";

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

describe("useMenuTreeEditor", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: MenuTreeEditor;

  function Probe({ checkedData }: { checkedData?: CheckedMenuData }) {
    editor = useMenuTreeEditor(checkedData);
    return null;
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("syncs remote rows and updates selection through stable editor actions", async () => {
    await act(async () => root.render(React.createElement(Probe)));
    expect(editor.checkedList).toEqual([]);

    await act(async () =>
      root.render(
        React.createElement(Probe, { checkedData: { list: [categoryMenu] } }),
      ),
    );
    expect(editor.checkedList).toEqual([categoryMenu]);

    const page = {
      id: "page-1",
      title: { en: "About", zh: "关于" },
      createdAt,
      updatedAt: null,
    } satisfies MenuSelectableItem;
    await act(async () => editor.onCheck(page, true, MenuType.PAGE));
    expect(editor.checkedList.map((item) => item.id)).toEqual([
      "category-1",
      "page-1",
    ]);

    await act(async () => editor.onCheck(page, false, MenuType.PAGE));
    expect(editor.checkedList.map((item) => item.id)).toEqual(["category-1"]);
  });
});
