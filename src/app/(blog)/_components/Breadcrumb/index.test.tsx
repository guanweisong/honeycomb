import { requireDefined } from "@tests/helpers/require-defined";
import type { MenuNavigationItem } from "@/app/(blog)/types/menu-navigation-item";
import { MenuType } from "@/features/menu/types/menu.type";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

let locale = "zh";
let segments = ["list", "category/parent/child"];

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegments: () => segments,
}));

vi.mock("next-intl", () => ({
  useLocale: () => locale,
}));

vi.mock("@/lib/i18n/blog-navigation", () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import Breadcrumb from "./";

const menu = [
  {
    id: "home",
    path: "/",
    title: { zh: "首页", en: "Home" },
    parent: null,
    power: 0,
    type: MenuType.CUSTOM,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "parent",
    path: "parent",
    title: { zh: "父分类", en: "Parent" },
    parent: null,
    power: 1,
    type: MenuType.CATEGORY,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "child",
    path: "child",
    title: { zh: "子分类", en: "Child" },
    parent: "parent",
    power: 2,
    type: MenuType.CATEGORY,
    createdAt: null,
    updatedAt: null,
  },
];

describe("Breadcrumb", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    segments = ["list", "category/parent/child"];
    locale = "zh";
  });

  const render = (items: MenuNavigationItem[] = menu) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Breadcrumb menu={items} />));
  };

  it("renders localized links and current item for nested categories", () => {
    render();

    const navigation = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(navigation?.textContent).toBe("首页 / 父分类 / 子分类");
    expect(
      navigation?.querySelector('a[href="/list/category"]')?.textContent,
    ).toBe("首页");
    expect(navigation?.querySelectorAll('[aria-current="page"]')).toHaveLength(
      1,
    );
    expect(
      navigation?.querySelector('a[href="/list/category/parent"]')?.textContent,
    ).toBe("父分类");
    expect(
      Array.from(
        navigation?.querySelectorAll('[aria-current="page"]') ?? [],
      ).at(-1)?.textContent,
    ).toBe("子分类");
  });

  it.each(["zh", "en"])(
    "resolves all category ancestors in %s within their own branch",
    (language) => {
      locale = language;
      segments = ["list", "category/parent/child/deep/leaf"];
      render([
        ...menu.slice(0, 2),
        {
          ...requireDefined(menu[2]),
          id: "wrong",
          parent: "other",
          title: { zh: "错误", en: "Wrong" },
        },
        ...menu.slice(2),
        {
          ...requireDefined(menu[2]),
          id: "deep",
          path: "deep",
          parent: "child",
          title: { zh: "深层", en: "Deep" },
        },
        {
          ...requireDefined(menu[2]),
          id: "leaf",
          path: "leaf",
          parent: "deep",
          title: { zh: "末层", en: "Leaf" },
        },
      ]);
      expect(container.textContent).toBe(
        language === "zh"
          ? "首页 / 父分类 / 子分类 / 深层 / 末层"
          : "Home / Parent / Child / Deep / Leaf",
      );
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(
        1,
      );
      expect(
        container.querySelector('a[href="/list/category/parent/child/deep"]'),
      ).not.toBeNull();
    },
  );

  it.each(
    [MenuType.PAGE, MenuType.CUSTOM].flatMap((type) =>
      [true, false].flatMap((rootBridge) =>
        ["zh", "en"].map((language) => ({ type, rootBridge, language })),
      ),
    ),
  )(
    "skips $type null-path ancestors (root=$rootBridge, locale=$language)",
    ({ type, rootBridge, language }) => {
      locale = language;
      segments = [
        "list",
        rootBridge ? "category/child" : "category/parent/child",
      ];
      const bridge = {
        ...requireDefined(menu[1]),
        id: "bridge",
        path: null,
        parent: rootBridge ? null : "parent",
        type,
      };
      render([
        ...menu.slice(0, 2),
        bridge,
        { ...requireDefined(menu[2]), parent: "bridge" },
      ]);

      expect(container.textContent).toBe(
        language === "zh"
          ? rootBridge
            ? "首页 / 子分类"
            : "首页 / 父分类 / 子分类"
          : rootBridge
            ? "Home / Child"
            : "Home / Parent / Child",
      );
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(
        1,
      );
      expect(
        container.querySelector('[aria-current="page"]')?.textContent,
      ).toBe(language === "zh" ? "子分类" : "Child");
      expect(container.querySelectorAll("a")).toHaveLength(rootBridge ? 1 : 2);
      if (!rootBridge) {
        expect(
          container.querySelector('a[href="/list/category/parent"]'),
        ).not.toBeNull();
      }
    },
  );

  it("keeps null-path ancestor resolution within the complete route branch", () => {
    render([
      ...menu.slice(0, 2),
      {
        ...requireDefined(menu[1]),
        id: "other",
        path: "other",
      },
      {
        ...requireDefined(menu[1]),
        id: "bridge",
        path: null,
        parent: "other",
      },
      { ...requireDefined(menu[2]), parent: "bridge" },
    ]);

    expect(container.querySelector("nav")).toBeNull();
  });

  it.each([
    "category",
    "category/unknown",
    "category/parent/missing",
    "tags/parent",
    "authors/parent",
  ])("omits unresolved or non-category route %s", (path) => {
    segments = ["list", path];
    render();
    expect(container.querySelector("nav")).toBeNull();
  });

  it("omits navigation when the route is not a nested list", () => {
    segments = ["archives", "post-1"];
    render();

    expect(container.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
  });
});
