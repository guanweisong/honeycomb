import { MenuType } from "@/features/menu/menu-types";
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let pathname = "/list/category/parent/child";
let segments = ["list", "category/parent/child"];
let categoryId: string | undefined;

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSelectedLayoutSegments: () => segments,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    post: {
      getCategoryId: {
        useQuery: () => ({ data: categoryId ? { categoryId } : undefined }),
      },
    },
  },
}));

vi.mock("@/lib/i18n/blog-navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { ...props, href }, children),
}));

import Menu from "./index";
import Breadcrumb from "../Breadcrumb";
import getCurrentPathOfMenu from "../../lib/get-current-path-of-menu";
import type { MenuItem as MenuViewModel } from "@/features/menu/types";
import type { MenuLocalEntity } from "../../types/menu.local.entity";

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

const menuData: MenuLocalEntity[] = [
  { label: "父分类", link: "/list/category/parent", children: [] },
  { label: "关于", link: "/pages/about", children: [] },
];

describe("blog menu navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    pathname = "/list/category/parent/child";
    segments = ["list", "category/parent/child"];
    categoryId = undefined;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderMenu() {
    await act(async () => {
      root.render(
        React.createElement(Menu, {
          data: menuData,
          flatMenuData: flatMenu,
        }),
      );
    });
  }

  it("renders only root links in order without submenu controls for nested input", async () => {
    await act(async () =>
      root.render(
        React.createElement(Menu, {
          flatMenuData: flatMenu,
          data: [
            {
              label: "父分类",
              link: "/list/category/parent",
              children: [
                {
                  label: "子分类",
                  link: "/list/category/parent/child",
                  children: [
                    {
                      label: "孙分类",
                      link: "/list/category/parent/child/grandchild",
                      children: [],
                    },
                  ],
                },
              ],
            },
            { label: "关于", link: "/pages/about", children: [] },
          ],
        }),
      ),
    );
    const toggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open menu"]',
    );
    await act(async () => toggle?.click());
    const navigation = container.querySelector("#mobile-menu");
    expect(
      Array.from(navigation?.querySelectorAll("a") ?? []).map((link) => ({
        label: link.textContent,
        href: link.getAttribute("href"),
      })),
    ).toEqual([
      { label: "父分类", href: "/list/category/parent" },
      { label: "关于", href: "/pages/about" },
    ]);
    expect(
      navigation?.querySelectorAll(
        "ul, button, [aria-expanded], [aria-controls]",
      ).length,
    ).toBe(0);
    expect(navigation?.textContent).not.toMatch(/[▴▾]/);
    expect(
      navigation?.querySelector('[aria-current="page"]')?.textContent,
    ).toBe("父分类");
  });

  it("closes the mobile menu with Escape and restores toggle focus", async () => {
    await renderMenu();
    const toggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open menu"]',
    );
    expect(toggle?.type).toBe("button");
    expect(toggle?.getAttribute("aria-controls")).toBe("mobile-menu");
    await act(async () => toggle?.click());
    const link = container.querySelector<HTMLAnchorElement>(
      'a[href="/list/category/parent"]',
    );
    link?.focus();
    expect(document.activeElement).toBe(link);
    await act(async () =>
      link?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(
      container.querySelector("#mobile-menu")?.classList.contains("hidden"),
    ).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it("marks the parent category active for a nested list route", async () => {
    await renderMenu();

    expect(
      container
        .querySelector('a[href="/list/category/parent"]')
        ?.getAttribute("aria-current"),
    ).toBe("page");
    expect(
      container.querySelector('a[href="/pages/about"]')?.className,
    ).toContain("group-hover:lg:text-teal-500");
  });

  it("opens and closes the mobile menu", async () => {
    await renderMenu();
    const toggle = container.querySelector('button[aria-label="Open menu"]');

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      container
        .querySelector('button[aria-label="Close menu"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
    expect(container.querySelector("#mobile-menu")?.className).toContain(
      "inset-x-0",
    );

    await act(async () => {
      document.body.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(
      container.querySelector('button[aria-label="Open menu"]'),
    ).not.toBeNull();
  });

  it("uses the post category ancestry on archive routes", async () => {
    segments = ["archives", "post-1"];
    pathname = "/archives/post-1";
    categoryId = "child-id";

    await renderMenu();

    expect(
      container
        .querySelector('a[href="/list/category/parent"]')
        ?.getAttribute("aria-current"),
    ).toBe("page");
  });

  it("does not invent a category highlight when archive detail lacks one", async () => {
    segments = ["archives", "post-1"];
    pathname = "/archives/post-1";

    await renderMenu();

    expect(container.querySelector('[aria-current="page"]')).toBeNull();
  });

  it("closes an open mobile menu after navigation", async () => {
    await renderMenu();
    await act(async () => {
      container
        .querySelector('button[aria-label="Open menu"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    pathname = "/pages/about";
    segments = ["pages", "about"];

    await renderMenu();

    expect(
      container.querySelector('button[aria-label="Open menu"]'),
    ).not.toBeNull();
  });

  it("renders localized breadcrumbs for both category levels", async () => {
    await act(async () => {
      root.render(React.createElement(Breadcrumb, { menu: flatMenu }));
    });

    const navigation = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(navigation?.textContent).toBe("首页 / 父分类 / 子分类");
    expect(
      navigation?.querySelector('a[href="/list/category"]'),
    ).not.toBeNull();
    expect(
      Array.from(
        navigation?.querySelectorAll('[aria-current="page"]') ?? [],
      ).at(-1)?.textContent,
    ).toBe("子分类");
  });

  it("omits breadcrumbs outside nested list routes", async () => {
    segments = ["archives", "post-1"];

    await act(async () => {
      root.render(React.createElement(Breadcrumb, { menu: flatMenu }));
    });

    expect(container.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
  });
});

describe("get-current-path-of-menu", () => {
  it("returns ancestor paths from root to the selected item", () => {
    expect(
      getCurrentPathOfMenu({
        familyProp: "path",
        id: "child-id",
        menu: flatMenu,
      }),
    ).toEqual(["parent", "child"]);
  });

  it("returns an empty path for missing ids or non-string family values", () => {
    expect(
      getCurrentPathOfMenu({
        familyProp: "path",
        id: "missing",
        menu: flatMenu,
      }),
    ).toEqual([]);
    expect(
      getCurrentPathOfMenu({
        familyProp: "title",
        id: "child-id",
        menu: flatMenu,
      }),
    ).toEqual([]);
    expect(
      getCurrentPathOfMenu({
        familyProp: "path",
        menu: flatMenu,
      }),
    ).toEqual([]);
  });

  it("supports a single root record", () => {
    expect(
      getCurrentPathOfMenu({
        familyProp: "path",
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
        familyProp: "path",
        menu: [record("a", null), record("b", "a"), record("c", "b")],
      }),
    ).toEqual(["a", "b", "c"]);
  });
  it("does not treat an unrelated singleton as the requested id", () => {
    expect(
      getCurrentPathOfMenu({
        id: "missing",
        familyProp: "path",
        menu: [record("a", null)],
      }),
    ).toEqual([]);
  });
  it("retains the known path for an orphan and stops cycles without duplicates", () => {
    expect(
      getCurrentPathOfMenu({
        id: "b",
        familyProp: "path",
        menu: [record("a", "missing"), record("b", "a")],
      }),
    ).toEqual(["a", "b"]);
    expect(
      getCurrentPathOfMenu({
        id: "b",
        familyProp: "path",
        menu: [record("a", "b"), record("b", "a")],
      }),
    ).toEqual(["a", "b"]);
    expect(
      getCurrentPathOfMenu({
        id: "a",
        familyProp: "path",
        menu: [record("a", "a")],
      }),
    ).toEqual(["a"]);
  });
});
