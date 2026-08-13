import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("div", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("./components/MenuTitle", () => ({
  MenuTitle: ({
    item,
    toggleMenu,
  }: {
    item: { name: string; path: string; children?: unknown[] };
    toggleMenu?: (path: string) => void;
  }) =>
    item.children
      ? React.createElement(
          "button",
          { onClick: () => toggleMenu?.(item.path) },
          item.name,
        )
      : React.createElement("a", { href: item.path }, item.name),
}));

import { Menu } from "./index";

describe("Menu", () => {
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

  it("renders leaf links and toggles nested menu items", async () => {
    await act(async () => {
      root.render(
        React.createElement(Menu, {
          data: [
            { name: "首页", path: "/admin" },
            {
              name: "内容管理",
              path: "/admin/content",
              children: [{ name: "文章", path: "/admin/content/posts" }],
            },
          ],
        }),
      );
    });

    expect(container.querySelector('a[href="/admin"]')?.textContent).toBe(
      "首页",
    );
    expect(container.textContent).not.toContain("文章");

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(container.textContent).toContain("文章");
  });
});
