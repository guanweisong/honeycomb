import React, { act } from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockUseSiteSetting = vi.fn();
const mockRefreshUser = vi.fn();
const mockGetProviders = vi.fn();

vi.mock("@/app/admin/hooks/useSiteSetting", () => ({
  useSiteSetting: () => mockUseSiteSetting(),
}));

vi.mock("@/app/admin/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock("next-auth/react", () => ({
  getProviders: (...args: unknown[]) => mockGetProviders(...args),
  signIn: vi.fn(),
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => null,
}));

vi.mock("@/packages/ui/extended/DynamicForm", () => ({
  DynamicForm: () => React.createElement("form"),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("./providerIcons", () => ({
  providerIcons: {
    github: React.createElement("span", null, "github"),
  },
}));

import LoginPage from "./page";

describe("admin login page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockRefreshUser.mockReset();
    mockUseSiteSetting.mockReset();
    mockGetProviders.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("shows loading placeholders before setting and providers resolve", async () => {
    mockUseSiteSetting.mockReturnValue({
      setting: undefined,
      isLoading: true,
      refreshSetting: vi.fn(),
    });
    mockGetProviders.mockImplementation(
      () => new Promise(() => undefined),
    );

    await act(async () => {
      root.render(React.createElement(LoginPage));
    });

    expect(
      container.querySelector('[data-testid="login-site-name-skeleton"]'),
    ).not.toBeNull();
    expect(
      container.querySelectorAll('[data-testid="login-provider-skeleton"]'),
    ).toHaveLength(2);
  });

  it("renders resolved setting and oauth providers after loading", async () => {
    mockUseSiteSetting.mockReturnValue({
      setting: {
        siteName: {
          zh: "Honeycomb",
        },
      },
      isLoading: false,
      refreshSetting: vi.fn(),
    });
    mockGetProviders.mockResolvedValue({
      github: {
        id: "github",
        name: "GitHub",
      },
      credentials: {
        id: "credentials",
        name: "Credentials",
      },
    });

    await act(async () => {
      root.render(React.createElement(LoginPage));
    });

    expect(container.textContent).toContain("Honeycomb");
    expect(container.textContent).toContain("使用GitHub登录");
    expect(
      container.querySelector('[data-testid="login-site-name-skeleton"]'),
    ).toBeNull();
  });
});
