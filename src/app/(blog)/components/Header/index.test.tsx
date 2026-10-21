import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    ViewTransition: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("next-intl/server", () => ({
  getLocale: async () => "zh",
}));

vi.mock("@/app/lib/server/public-queries", () => ({
  getPublicMenu: async () => ({
    list: [
      {
        id: "links",
        parent: "0",
        path: "/friend-links",
        title: { zh: "友链" },
        type: "CUSTOM",
      },
      {
        id: "page-1",
        parent: "0",
        path: "about",
        title: { zh: "关于" },
        type: "PAGE",
      },
      {
        id: "parent-id",
        parent: "0",
        path: "parent",
        title: { zh: "父分类" },
        type: "CATEGORY",
      },
      {
        id: "child-id",
        parent: "parent-id",
        path: "child",
        title: { zh: "子分类" },
        type: "CATEGORY",
      },
      {
        id: "grandchild-id",
        parent: "child-id",
        path: "grandchild",
        title: { zh: "孙分类" },
        type: "CATEGORY",
      },
    ],
  }),
  getPublicSetting: async () => ({ siteName: { zh: "蜂巢博客" } }),
}));

vi.mock("@/lib/i18n/blog-navigation", () => ({
  Link: ({
    children,
    href,
    scroll: _scroll,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    scroll?: boolean;
  }) => {
    void _scroll;
    return React.createElement("a", { ...props, href }, children);
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/list/category/parent/child/grandchild",
  useSelectedLayoutSegments: () => ["list", "category/parent/child/grandchild"],
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: { post: { getCategoryId: { useQuery: () => ({ data: undefined }) } } },
}));

const clientProps = vi.hoisted(() => ({
  menu: [] as unknown[],
  display: [] as unknown[],
  breadcrumb: [] as unknown[],
}));

vi.mock("@/app/(blog)/components/Menu", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/app/(blog)/components/Menu")>();
  return {
    default: (props: import("@/app/(blog)/components/Menu").MenuProps) => {
      clientProps.menu = props.flatMenuData;
      clientProps.display = props.data;
      return React.createElement(original.default, props);
    },
  };
});

vi.mock("@/app/(blog)/components/Breadcrumb", () => ({
  default: ({ menu }: { menu: unknown[] }) => {
    clientProps.breadcrumb = menu;
    return React.createElement("div", { "data-breadcrumb-count": menu.length });
  },
}));

vi.mock("@/app/(blog)/components/ThemeSwitcher", () => ({
  ThemeSwitcher: () => React.createElement("button", null, "主题"),
}));

vi.mock("@/app/(blog)/components/LanguageSwitcher", () => ({
  default: () => React.createElement("button", null, "语言"),
}));

vi.mock("@/features/post/public/components/PostSearch", () => ({
  default: () => React.createElement("button", null, "搜索"),
}));

import Header from "./index";

describe("blog Header", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("sends only navigation fields to client menu and breadcrumb components", async () => {
    await act(async () => root.render(await Header()));
    expect(
      clientProps.display.every(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          !Object.hasOwn(item, "children"),
      ),
    ).toBe(true);
    clientProps.menu.forEach((item, index) => {
      expect(clientProps.breadcrumb[index + 1]).toBe(item);
    });
    for (const items of [clientProps.menu, clientProps.breadcrumb]) {
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        if (!item || typeof item !== "object")
          throw new Error("Expected a navigation item");
        expect(Object.keys(item).sort()).toEqual([
          "id",
          "parent",
          "path",
          "title",
        ]);
      }
    }
  });

  it("renders root menu destinations while retaining all categories for breadcrumbs", async () => {
    const element = await Header();
    await act(async () => root.render(element));

    expect(
      container.querySelector('a[href="/list/category"]')?.textContent,
    ).toBe("蜂巢博客");
    expect(container.querySelectorAll('a[href="/list/category"]')).toHaveLength(
      2,
    );
    expect(
      container.querySelector('a[href="/friend-links"]')?.textContent,
    ).toBe("友链");
    expect(
      container.querySelector('a[href="/pages/page-1"]')?.textContent,
    ).toBe("关于");
    expect(
      container.querySelector('a[href="/list/category/parent"]')?.textContent,
    ).toBe("父分类");
    const navigation = container.querySelector("#mobile-menu");
    expect(
      Array.from(navigation?.querySelectorAll("a") ?? []).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual([
      "/list/category",
      "/friend-links",
      "/pages/page-1",
      "/list/category/parent",
    ]);
    expect(navigation?.querySelector("ul, button")).toBeNull();
    expect(
      navigation?.querySelector('[aria-current="page"]')?.textContent,
    ).toBe("父分类");
    expect(
      container
        .querySelector("[data-breadcrumb-count]")
        ?.getAttribute("data-breadcrumb-count"),
    ).toBe("6");
    expect(container.textContent).toContain("主题");
    expect(container.textContent).toContain("语言");
    expect(container.textContent).toContain("搜索");
  });
});
