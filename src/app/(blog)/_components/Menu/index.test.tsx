import { MenuType } from "@/features/menu/types/menu.type";
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
import type { MenuItem as MenuViewModel } from "@/features/menu/types/menu.list";
import type { BlogNavigationLink } from "../../types/blog-navigation-link";

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

const menuData: BlogNavigationLink[] = [
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

  it("renders only root links in order without submenu controls while nested navigation stays flat", async () => {
    await act(async () =>
      root.render(
        React.createElement(Menu, {
          flatMenuData: flatMenu,
          data: [
            {
              label: "父分类",
              link: "/list/category/parent",
            },
            { label: "关于", link: "/pages/about" },
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
