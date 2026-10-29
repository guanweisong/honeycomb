import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockUserDropdown = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("@/components/Avatar", () => ({
  default: ({ fallback }: { fallback?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "avatar" }, fallback),
}));

vi.mock("@/features/user/admin/UserDropdown", () => ({
  UserDropdown: () => {
    mockUserDropdown({});
    return React.createElement("div", { "data-testid": "user-dropdown" });
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { AdminLayout } from "@/app/admin/components/AdminLayout/index";

describe("AdminLayout", () => {
  let container: HTMLDivElement;
  let root: Root;
  let storage: Record<string, string> = {};
  let matchMediaMatches = false;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUserDropdown.mockReset();
    mockUsePathname.mockReset();
    storage = {};
    matchMediaMatches = false;
    mockUsePathname.mockReturnValue("/admin/post/list");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        () =>
          Object.assign(new EventTarget(), {
            matches: matchMediaMatches,
          }) satisfies Pick<
            MediaQueryList,
            "matches" | "addEventListener" | "removeEventListener"
          >,
      ),
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
    } satisfies Pick<Storage, "getItem" | "setItem">);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
        children: React.createElement(
          "div",
          { "data-testid": "content" },
          "内容",
        ),
      };

      root.render(React.createElement(AdminLayout, layoutProps));
    });
  };

  it("limits sidebar transitions and disables them for reduced motion", async () => {
    await renderLayout();
    const sidebar = container.querySelector('[data-testid="admin-sidebar"]');
    expect(sidebar?.className).toContain("motion-reduce:transition-none");
    expect(sidebar?.className).not.toContain("transition-all");
  });
  it("defaults to expanded mode on wide screens", async () => {
    matchMediaMatches = false;
    await renderLayout();

    expect(container.querySelector('[data-testid="avatar"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/admin/post/list"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="user-dropdown"]'),
    ).not.toBeNull();
    expect(mockUserDropdown).toHaveBeenCalled();
    expect(container.querySelector(".w-\\[200px\\]")).not.toBeNull();
    expect(
      container.querySelector('[data-testid="admin-page-title"]')?.textContent,
    ).toBe("文章列表");
    expect(
      container.querySelector('button[aria-label="收起侧边栏"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="收起侧边栏"] svg'),
    ).not.toBeNull();
  });

  it("defaults to collapsed mode on narrow screens", async () => {
    matchMediaMatches = true;
    await renderLayout();

    expect(container.querySelector('[data-testid="admin-sidebar"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="admin-sidebar-drawer"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="admin-page-title"]')?.textContent,
    ).toBe("文章列表");
    expect(
      container.querySelector('button[aria-label="打开侧边栏"]'),
    ).not.toBeNull();
  });

  it("uses a drawer toggle on narrow screens", async () => {
    matchMediaMatches = true;
    await renderLayout();

    const openButton = container.querySelector(
      'button[aria-label="打开侧边栏"]',
    );
    expect(openButton).not.toBeNull();

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('button[aria-label="关闭侧边栏"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="admin-sidebar-drawer"]'),
    ).not.toBeNull();
  });

  it("makes a collapsed desktop sidebar inert and hidden from assistive technology", async () => {
    await renderLayout();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="收起侧边栏"]')
        ?.click(),
    );
    const sidebar = container.querySelector('[data-testid="admin-sidebar"]');
    expect(sidebar?.hasAttribute("inert")).toBe(true);
    expect(sidebar?.getAttribute("aria-hidden")).toBe("true");
  });

  it("manages mobile focus and closes on Escape with focus returned to the opener", async () => {
    matchMediaMatches = true;
    await renderLayout();
    const opener = container.querySelector<HTMLButtonElement>(
      'button[aria-label="打开侧边栏"]',
    );
    opener?.focus();
    await act(async () => opener?.click());
    const drawer = document.querySelector(
      '[data-testid="admin-sidebar-drawer"]',
    );
    expect(drawer?.getAttribute("role")).toBe("dialog");
    expect(drawer?.contains(document.activeElement)).toBe(true);
    // Radix keeps programmatic focus within the modal; jsdom does not emulate browser Tab traversal.
    await act(async () => opener?.focus());
    expect(drawer?.contains(document.activeElement)).toBe(true);
    await act(async () =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(
      document.querySelector('[data-testid="admin-sidebar-drawer"]'),
    ).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("toggles visibility and persists it", async () => {
    const getItem = vi.fn((key: string) => storage[key] ?? null);
    const setItem = vi.fn((key: string, value: string) => {
      storage[key] = value;
    });

    vi.stubGlobal("localStorage", {
      getItem,
      setItem,
    } satisfies Pick<Storage, "getItem" | "setItem">);

    await renderLayout();

    const button = container.querySelector('button[aria-label="收起侧边栏"]');
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setItem).toHaveBeenLastCalledWith("admin-sidebar-collapsed", "true");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="展开侧边栏"]')
        ?.click(),
    );
    expect(setItem).toHaveBeenLastCalledWith(
      "admin-sidebar-collapsed",
      "false",
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="收起侧边栏"]')
        ?.click(),
    );
    expect(
      container.querySelector('button[aria-label="展开侧边栏"]'),
    ).not.toBeNull();
  });

  it.each(["getItem", "setItem"] as const)(
    "keeps layout usable when storage %s throws",
    async (method) => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      vi.stubGlobal(
        "matchMedia",
        () =>
          ({
            matches: false,
            addEventListener,
            removeEventListener,
          }) satisfies Pick<
            MediaQueryList,
            "matches" | "addEventListener" | "removeEventListener"
          >,
      );
      vi.mocked(window.localStorage[method]).mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });
      await renderLayout();
      expect(addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('button[aria-label="收起侧边栏"]')
          ?.click(),
      );
      expect(
        container.querySelector('button[aria-label="展开侧边栏"]'),
      ).not.toBeNull();
      await act(async () => root.unmount());
      expect(removeEventListener).toHaveBeenCalledWith(
        "change",
        addEventListener.mock.calls[0]?.[1],
      );
      root = createRoot(container);
    },
  );

  it("restores a persisted collapsed sidebar preference", async () => {
    storage["admin-sidebar-collapsed"] = "true";

    await renderLayout();

    expect(
      container.querySelector('button[aria-label="展开侧边栏"]'),
    ).not.toBeNull();
  });
});
