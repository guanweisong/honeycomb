import { describe, expect, it } from "vitest";
import { MenuType } from "@/features/menu/types/menu.type";
import type { MenuItem as MenuViewModel } from "@/features/menu/types/menu.list";
import getCurrentPathOfMenu from "@/app/(blog)/lib/get-current-path-of-menu";

const flatMenu: MenuViewModel[] = [
  {
    id: "home",
    parent: "0",
    path: "/",
    title: { zh: "首页" },
    power: 0,
    type: MenuType.CUSTOM,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "parent-id",
    parent: "0",
    path: "parent",
    title: { zh: "父分类" },
    power: 1,
    type: MenuType.CATEGORY,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "child-id",
    parent: "parent-id",
    path: "child",
    title: { zh: "子分类" },
    power: 2,
    type: MenuType.CATEGORY,
    createdAt: null,
    updatedAt: null,
  },
];

describe("get-current-path-of-menu", () => {
  it("returns ancestor paths from root to the selected item", () => {
    expect(
      getCurrentPathOfMenu({
        id: "child-id",
        menu: flatMenu,
      }),
    ).toEqual(["parent", "child"]);
  });

  it("returns an empty path for missing ids", () => {
    expect(
      getCurrentPathOfMenu({
        id: "missing",
        menu: flatMenu,
      }),
    ).toEqual([]);
    expect(
      getCurrentPathOfMenu({
        menu: flatMenu,
      }),
    ).toEqual([]);
  });

  it("supports a single root record", () => {
    expect(
      getCurrentPathOfMenu({
        id: "only",
        menu: [
          {
            id: "only",
            parent: "0",
            path: "root",
          },
        ],
      }),
    ).toEqual(["root"]);
  });
});

describe("deep menu ancestry", () => {
  const record = (id: string, parent: string | null): MenuViewModel => ({
    id,
    parent,
    path: id,
    power: 0,
    type: MenuType.CATEGORY,
    createdAt: null,
    updatedAt: null,
  });
  it("walks every ancestor using the full menu", () => {
    expect(
      getCurrentPathOfMenu({
        id: "c",
        menu: [record("a", null), record("b", "a"), record("c", "b")],
      }),
    ).toEqual(["a", "b", "c"]);
  });
  it("does not treat an unrelated singleton as the requested id", () => {
    expect(
      getCurrentPathOfMenu({
        id: "missing",
        menu: [record("a", null)],
      }),
    ).toEqual([]);
  });
  it("retains the known path for an orphan and stops cycles without duplicates", () => {
    expect(
      getCurrentPathOfMenu({
        id: "b",
        menu: [record("a", "missing"), record("b", "a")],
      }),
    ).toEqual(["a", "b"]);
    expect(
      getCurrentPathOfMenu({
        id: "b",
        menu: [record("a", "b"), record("b", "a")],
      }),
    ).toEqual(["a", "b"]);
    expect(
      getCurrentPathOfMenu({
        id: "a",
        menu: [record("a", "a")],
      }),
    ).toEqual(["a"]);
  });
});
