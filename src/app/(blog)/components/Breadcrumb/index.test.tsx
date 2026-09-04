import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

let segments = ["list", "category/parent/child"];

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegments: () => segments,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}));

vi.mock("@/packages/ui/navigation/blog-navigation", () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import Breadcrumb from ".";

const menu = [
  { id: "home", path: "/", title: { zh: "首页" }, parent: null, power: 0, type: "CUSTOM", createdAt: null, updatedAt: null },
  { id: "parent", path: "parent", title: { zh: "父分类" }, parent: null, power: 1, type: "CATEGORY", createdAt: null, updatedAt: null },
  { id: "child", path: "child", title: { zh: "子分类" }, parent: "parent", power: 2, type: "CATEGORY", createdAt: null, updatedAt: null },
];

describe("Breadcrumb", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    segments = ["list", "category/parent/child"];
  });

  const render = () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Breadcrumb menu={menu} />));
  };

  it("renders localized links and current item for nested categories", () => {
    render();

    const navigation = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(navigation?.textContent).toBe("首页 / 父分类 / 子分类");
    expect(
      navigation?.querySelector('a[href="/list/category"]')?.textContent,
    ).toBe("首页");
    expect(
      Array.from(
        navigation?.querySelectorAll('[aria-current="page"]') ?? [],
      ).at(-1)?.textContent,
    ).toBe("子分类");
  });

  it("omits navigation when the route is not a nested list", () => {
    segments = ["archives", "post-1"];
    render();

    expect(container.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
  });
});
