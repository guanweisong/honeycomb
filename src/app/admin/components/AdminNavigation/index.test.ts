import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("div", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { AdminNavigation } from "./index";
import { menu } from "@/app/admin/constants/menu-data";

describe("AdminNavigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pathname = "/admin";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each(["/admin/post/list", "/admin/page/edit"])(
    "opens the actual active ancestor for %s",
    async (route) => {
      pathname = route;
      await act(async () =>
        root.render(React.createElement(AdminNavigation, { data: menu })),
      );
      expect(container.querySelector(`a[href="${route}"]`)).not.toBeNull();
      const parent = container.querySelector<HTMLButtonElement>(
        `button[aria-label="${route.includes("/post/") ? "文章" : "页面"}"]`,
      );
      expect(parent?.getAttribute("aria-expanded")).toBe("true");
      expect(
        container.querySelector(
          `a[href="${route.includes("/post/") ? "/admin/page/edit" : "/admin/post/list"}"]`,
        ),
      ).toBeNull();
    },
  );

  it("renders leaf links and toggles nested menu items", async () => {
    await act(async () => {
      root.render(
        React.createElement(AdminNavigation, {
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
