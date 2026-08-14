import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/admin/current" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

import { MenuTitle } from "./index";

describe("MenuTitle", () => {
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

  it("renders a leaf item as a link and highlights the current path", async () => {
    navigation.pathname = "/admin/current";
    await act(async () => {
      root.render(
        React.createElement(MenuTitle, {
          item: { name: "当前页", path: "/admin/current" },
          openMenus: [],
        }),
      );
    });
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/admin/current");
    expect(link?.textContent).toContain("当前页");
    expect(link?.className).toContain("!bg-gray-800");
  });

  it("toggles a parent item", async () => {
    const toggleMenu = vi.fn();
    await act(async () => {
      root.render(
        React.createElement(MenuTitle, {
          item: { name: "内容", path: "/admin/content", children: [] },
          openMenus: [],
          toggleMenu,
        }),
      );
    });
    await act(async () => container.firstElementChild?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(toggleMenu).toHaveBeenCalledWith("/admin/content");
  });

  it("keeps leaf navigation on the link", async () => {
    await act(async () => {
      root.render(
        React.createElement(MenuTitle, {
          item: { name: "链接导航", path: "/admin/custom" },
          openMenus: [],
        }),
      );
    });

    expect(container.querySelector("a")?.getAttribute("href")).toBe("/admin/custom");
  });
});
