import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MenuType } from "@/features/menu/types/menu.type";
import { useMenuTreeEditor, type MenuTreeEditor } from "./use-menu-tree-editor";
import type {
  CheckedMenuData,
  MenuEntityTree,
  MenuSelectableItem,
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
} satisfies MenuEntityTree;

describe("use-menu-tree-editor", () => {
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

  it("ignores edits before a versioned baseline and adopts the first server snapshot", async () => {
    await act(async () => root.render(React.createElement(Probe)));
    expect(editor.getDisabledStatus(categoryMenu)).toBe(true);
    await act(async () => {
      editor.onCheck(categoryMenu, true, MenuType.CATEGORY);
      editor.onDragEnd([
        { ...categoryMenu, title: "Early", subtitle: "", expanded: true },
      ]);
      editor.removeBranch("missing");
    });
    expect(editor.checkedList).toEqual([]);
    expect(editor.dirty).toBe(false);
    await act(async () =>
      root.render(
        React.createElement(Probe, {
          checkedData: { list: [categoryMenu], version: 0 },
        }),
      ),
    );
    expect(editor.baseVersion).toBe(0);
    expect(editor.checkedList).toEqual([categoryMenu]);
    expect(editor.dirty).toBe(false);
  });

  it("does not adopt a background snapshot when pending input returns to the old baseline", async () => {
    await act(async () =>
      root.render(
        React.createElement(Probe, {
          checkedData: { list: [categoryMenu], version: 0 },
        }),
      ),
    );
    await act(async () => editor.setProtected(true));
    const item = {
      id: "page-pending",
      title: { en: "P", zh: "页" },
      createdAt,
      updatedAt: null,
    };
    await act(async () => editor.onCheck(item, true, MenuType.PAGE));
    const submitted = editor.checkedList;
    await act(async () => editor.onCheck(item, false, MenuType.PAGE));
    expect(editor.dirty).toBe(false);
    await act(async () =>
      root.render(
        React.createElement(Probe, {
          checkedData: { list: submitted, version: 1 },
        }),
      ),
    );
    expect(editor.checkedList).toEqual([categoryMenu]);
    await act(async () => editor.acknowledge(submitted, 1));
    expect(editor.dirty).toBe(true);
  });
  it("lets users explicitly remove orphan nodes and their descendants", async () => {
    const orphan = {
      ...categoryMenu,
      id: "orphan-row-uuid",
      title: null,
      path: undefined,
    };
    const child = { ...categoryMenu, id: "child", parent: orphan.id };
    await act(async () =>
      root.render(
        React.createElement(Probe, {
          checkedData: { list: [orphan, child], version: 0 },
        }),
      ),
    );
    await act(async () => editor.removeBranch(orphan.id));
    expect(editor.checkedList).toEqual([]);
    expect(editor.dirty).toBe(true);
  });

  it("keeps local edits on background refresh and acknowledges only submitted rows", async () => {
    await act(async () =>
      root.render(
        React.createElement(Probe, {
          checkedData: { list: [categoryMenu], version: 0 },
        }),
      ),
    );
    const added = {
      id: "page-local",
      title: { en: "Local", zh: "本地" },
      createdAt,
      updatedAt: null,
    };
    await act(async () => editor.onCheck(added, true, MenuType.PAGE));
    const submitted = editor.checkedList;
    await act(async () =>
      root.render(
        React.createElement(Probe, { checkedData: { list: [], version: 1 } }),
      ),
    );
    expect(editor.checkedList).toHaveLength(2);
    expect(editor.baseVersion).toBe(0);
    await act(async () =>
      editor.onCheck({ ...added, id: "newer" }, true, MenuType.PAGE),
    );
    await act(async () => editor.acknowledge(submitted, 1));
    expect(editor.checkedList).toHaveLength(3);
    expect(editor.baseVersion).toBe(1);
    expect(editor.dirty).toBe(true);
  });

  it("syncs remote rows and updates selection through stable editor actions", async () => {
    await act(async () => root.render(React.createElement(Probe)));
    expect(editor.checkedList).toEqual([]);

    await act(async () =>
      root.render(
        React.createElement(Probe, {
          checkedData: { list: [categoryMenu], version: 0 },
        }),
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
