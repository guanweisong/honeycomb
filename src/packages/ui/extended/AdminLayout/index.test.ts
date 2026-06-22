import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockMenu = vi.fn();
const mockUserDropdown = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("../Avatar", () => ({
  default: ({
    fallback,
  }: {
    fallback?: React.ReactNode;
  }) => React.createElement("div", { "data-testid": "avatar" }, fallback),
}));

vi.mock("../Menu", () => ({
  Menu: () => {
    mockMenu({});
    return React.createElement("div", { "data-testid": "menu" });
  },
}));

vi.mock("../UserDropdown", () => ({
  UserDropdown: () => {
    mockUserDropdown({});
    return React.createElement("div", { "data-testid": "user-dropdown" });
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { AdminLayout } from "./index";

describe("AdminLayout", () => {
  let container: HTMLDivElement;
  let root: Root;
  let storage: Record<string, string> = {};
  let matchMediaMatches = false;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockMenu.mockReset();
    mockUserDropdown.mockReset();
    mockUsePathname.mockReset();
    storage = {};
    matchMediaMatches = false;
    mockUsePathname.mockReturnValue("/admin/post/list");
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: matchMediaMatches })) as never,
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as never);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  const renderLayout = async () => {
    await act(async () => {
      const layoutProps: React.ComponentProps<typeof AdminLayout> = {
        title: "Honeycomb",
        menu: [
          {
            name: "文章",
            path: "/admin/post",
            children: [{ name: "文章列表", path: "/admin/post/list" }],
          },
        ],
        onLogout: vi.fn(),
        children: React.createElement("div", { "data-testid": "content" }, "内容"),
      };

      root.render(
        React.createElement(
          AdminLayout as React.JSXElementConstructor<
            React.ComponentProps<typeof AdminLayout>
          >,
          layoutProps,
        ),
      );
    });
  };

  it("defaults to expanded mode on wide screens", async () => {
    matchMediaMatches = false;
    await renderLayout();

    expect(container.querySelector('[data-testid="avatar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="menu"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="user-dropdown"]')).not.toBeNull();
    expect(mockMenu).toHaveBeenCalled();
    expect(mockUserDropdown).toHaveBeenCalled();
    expect(container.querySelector(".w-\\[200px\\]")).not.toBeNull();
    expect(container.querySelector('[data-testid="admin-page-title"]')?.textContent).toBe(
      "文章列表",
    );
    expect(container.querySelector('button[aria-label="收起侧边栏"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="收起侧边栏"] svg')).not.toBeNull();
  });

  it("defaults to collapsed mode on narrow screens", async () => {
    matchMediaMatches = true;
    await renderLayout();

    expect(
      container
        .querySelector('[data-testid="admin-sidebar"]')
        ?.className.includes("w-0"),
    ).toBe(true);
    expect(container.querySelector('[data-testid="admin-page-title"]')?.textContent).toBe(
      "文章列表",
    );
    expect(container.querySelector('button[aria-label="展开侧边栏"]')).not.toBeNull();
  });

  it("toggles visibility and persists it", async () => {
    const getItem = vi.fn((key: string) => storage[key] ?? null);
    const setItem = vi.fn((key: string, value: string) => {
      storage[key] = value;
    });

    vi.stubGlobal("localStorage", {
      getItem,
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as never);

    await renderLayout();

    const button = container.querySelector('button[aria-label="收起侧边栏"]');
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setItem).toHaveBeenCalledWith("admin-sidebar-collapsed", "false");
    expect(container.querySelector('button[aria-label="展开侧边栏"]')).not.toBeNull();
  });
});
