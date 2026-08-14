import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/packages/trpc/api", () => ({
  createServerClient: async () => ({
    menu: {
      index: async () => ({
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
        ],
      }),
    },
    setting: {
      index: async () => ({ siteName: { zh: "蜂巢博客" } }),
    },
  }),
}));

vi.mock("@/app/(blog)/i18n/navigation", () => ({
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

vi.mock("@/app/(blog)/components/Menu", () => ({
  default: ({
    data,
    flatMenuData,
  }: {
    data: Array<{
      children?: Array<unknown>;
      label: string;
      link?: string;
    }>;
    flatMenuData: unknown[];
  }) => {
    const renderItems = (
      items: Array<{
        children?: Array<unknown>;
        label: string;
        link?: string;
      }>,
    ): React.ReactNode =>
      React.createElement(
        "ul",
        null,
        items.map((item) =>
          React.createElement(
            "li",
            { key: item.label },
            React.createElement("a", { href: item.link }, item.label),
            item.children
              ? renderItems(item.children as typeof items)
              : undefined,
          ),
        ),
      );
    return React.createElement(
      "nav",
      { "data-flat-count": flatMenuData.length },
      renderItems(data),
    );
  },
}));

vi.mock("@/app/(blog)/components/Breadcrumb", () => ({
  default: ({ menu }: { menu: unknown[] }) =>
    React.createElement("div", { "data-breadcrumb-count": menu.length }),
}));

vi.mock("@/app/(blog)/components/ThemeSwitcher", () => ({
  ThemeSwitcher: () => React.createElement("button", null, "主题"),
}));

vi.mock("@/app/(blog)/components/LanguageSwitcher", () => ({
  default: () => React.createElement("button", null, "语言"),
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

  it("maps home, custom, page and nested category menu destinations", async () => {
    const element = await Header();
    await act(async () => root.render(element));

    expect(container.querySelector('a[href="/list/category"]')?.textContent).toBe(
      "蜂巢博客",
    );
    expect(container.querySelectorAll('a[href="/list/category"]')).toHaveLength(2);
    expect(container.querySelector('a[href="/friend-links"]')?.textContent).toBe(
      "友链",
    );
    expect(container.querySelector('a[href="/pages/page-1"]')?.textContent).toBe(
      "关于",
    );
    expect(
      container.querySelector('a[href="/list/category/parent"]')?.textContent,
    ).toBe("父分类");
    expect(
      container.querySelector('a[href="/list/category/parent/child"]')
        ?.textContent,
    ).toBe("子分类");
    expect(container.querySelector("nav")?.getAttribute("data-flat-count")).toBe(
      "4",
    );
    expect(
      container
        .querySelector("[data-breadcrumb-count]")
        ?.getAttribute("data-breadcrumb-count"),
    ).toBe("5");
    expect(container.textContent).toContain("主题");
    expect(container.textContent).toContain("语言");
  });
});
