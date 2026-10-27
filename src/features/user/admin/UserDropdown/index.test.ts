import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/Avatar", () => ({
  default: ({ fallback }: { fallback?: string | null }) =>
    React.createElement("span", { "data-testid": "avatar" }, fallback),
}));

import { UserDropdown } from "@/features/user/admin/UserDropdown/index";
import { UserLevel } from "@/features/user/types/user.level";

describe("UserDropdown", () => {
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

  it.each([false, true])(
    "provides a native keyboard-focusable trigger when collapsed=%s",
    async (collapsed) => {
      await act(async () =>
        root.render(
          React.createElement(UserDropdown, {
            user: { id: "admin-1", name: "管理员", level: UserLevel.ADMIN },
            collapsed,
            onLogout: vi.fn(),
          }),
        ),
      );
      const trigger = container.querySelector<HTMLElement>(
        "[data-slot=dropdown-menu-trigger]",
      );
      expect(trigger?.tagName).toBe("BUTTON");
      expect(trigger?.getAttribute("type")).toBe("button");
      expect(trigger?.getAttribute("aria-label")).toBe("账户菜单：管理员");
      expect(trigger?.tabIndex).toBe(0);
      trigger?.focus();
      expect(document.activeElement).toBe(trigger);
      await act(async () =>
        trigger?.dispatchEvent(
          new KeyboardEvent("keydown", { key: " ", bubbles: true }),
        ),
      );
      expect(trigger?.getAttribute("aria-expanded")).toBe("true");
      await act(async () => {
        document
          .querySelector('[role="menu"]')
          ?.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
      });
      expect(trigger?.getAttribute("aria-expanded")).toBe("false");
      // Radix restores focus asynchronously after the menu's unmount commits.
      await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    },
  );

  it("renders nothing without a user", async () => {
    await act(async () => {
      root.render(React.createElement(UserDropdown, { onLogout: vi.fn() }));
    });

    expect(container.textContent).toBe("");
  });

  it("calls onLogout when the logout action is selected", async () => {
    const onLogout = vi.fn();

    await act(async () => {
      root.render(
        React.createElement(UserDropdown, {
          user: { id: "admin-1", name: "管理员", level: UserLevel.ADMIN },
          onLogout,
        }),
      );
    });

    expect(container.textContent).toContain("管理员");
    await act(async () =>
      container
        .querySelector("[data-slot=dropdown-menu-trigger]")
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        ),
    );
    expect(document.body.textContent).toContain("退出登录");

    await act(async () => {
      document.querySelector<HTMLElement>('[role="menuitem"]')?.click();
    });

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
