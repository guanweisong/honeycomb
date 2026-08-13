import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../components/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => React.createElement("button", { onClick }, children),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
  DropdownMenuSeparator: () => React.createElement("hr"),
}));

vi.mock("../Avatar", () => ({
  default: ({ fallback }: { fallback?: string | null }) =>
    React.createElement("span", { "data-testid": "avatar" }, fallback),
}));

import { UserDropdown } from "./index";
import { UserLevel } from "@/packages/domain/identity/user";

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

  it("renders nothing without a user", async () => {
    await act(async () => {
      root.render(
        React.createElement(UserDropdown, { onLogout: vi.fn() }),
      );
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
    expect(container.textContent).toContain("退出登录");

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
