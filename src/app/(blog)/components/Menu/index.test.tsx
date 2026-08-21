import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let pathname = "/list/category/parent/child";
let segments = ["list", "category/parent/child"];
let categoryId: string | undefined;
let clickAway: (() => void) | undefined;

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSelectedLayoutSegments: () => segments,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}));

vi.mock("ahooks", () => ({
  useClickAway: (callback: () => void) => {
    clickAway = callback;
  },
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    post: {
      getCategoryId: {
        useQuery: () => ({ data: categoryId ? { categoryId } : undefined }),
      },
    },
  },
}));

vi.mock("@/packages/ui/navigation/blog-navigation", () => ({
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

const flatMenu = [
  {
    id: "home",
    parent: "0",
    path: "/",
    title: { zh: "首页" },
  },
  {
    id: "parent-id",
    parent: "0",
    path: "parent",
    title: { zh: "父分类" },
  },
  {
    id: "child-id",
    parent: "parent-id",
    path: "child",
    title: { zh: "子分类" },
  },
];

const menuData = [
  { label: "父分类", link: "/list/category/parent" },
  { label: "关于", link: "/pages/about" },
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
    clickAway = undefined;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderMenu() {
    await act(async () => {
      root.render(
        React.createElement(Menu, {
          data: menuData as never,
          flatMenuData: flatMenu as never,
        }),
      );
    });
  }

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

    await act(async () => clickAway?.());
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
      root.render(React.createElement(Breadcrumb, { menu: flatMenu as never }));
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
      root.render(React.createElement(Breadcrumb, { menu: flatMenu as never }));
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
        menu: flatMenu as never,
      }),
    ).toEqual(["parent", "child"]);
  });

  it("returns an empty path for missing ids or non-string family values", () => {
    expect(
      getCurrentPathOfMenu({
        familyProp: "path",
        id: "missing",
        menu: flatMenu as never,
      }),
    ).toEqual([]);
    expect(
      getCurrentPathOfMenu({
        familyProp: "title",
        id: "child-id",
        menu: flatMenu as never,
      }),
    ).toEqual([]);
    expect(
      getCurrentPathOfMenu({
        familyProp: "path",
        menu: flatMenu as never,
      }),
    ).toEqual([]);
  });

  it("supports a single root record", () => {
    expect(
      getCurrentPathOfMenu({
        familyProp: "path",
        id: "only",
        menu: [{ id: "only", parent: "0", path: "root" }] as never,
      }),
    ).toEqual(["root"]);
  });
});
