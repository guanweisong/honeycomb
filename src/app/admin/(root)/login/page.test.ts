import React, { act } from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockUseSiteSetting = vi.fn();
const mockRefreshUser = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/app/admin/hooks/useSiteSetting", () => ({
  useSiteSetting: () => mockUseSiteSetting(),
}));

vi.mock("@/app/admin/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock("@/auth-client", () => ({
  authClient: {
    signIn: {
      username: vi.fn(),
      social: vi.fn(),
      passkey: vi.fn(),
    },
    signOut: vi.fn(),
  },
}));

vi.mock("@marsidev/react-turnstile", () => ({
  DEFAULT_SCRIPT_ID: "cf-turnstile-script",
  SCRIPT_URL: "https://challenges.cloudflare.com/turnstile/v0/api.js",
  Turnstile: () => null,
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

vi.mock("@/packages/ui/extended/DynamicForm", () => ({
  DynamicForm: () => React.createElement("form"),
}));

vi.mock("@/packages/ui/components/skeleton", () => ({
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
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

import LoginClient from "./LoginClient";

describe("admin login page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockRefreshUser.mockReset();
    mockUseSiteSetting.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("renders server-provided setting and providers immediately", async () => {
    await act(async () => {
      root.render(
        React.createElement(LoginClient, {
          setting: { siteName: { zh: "Honeycomb" } },
          providers: [
            { id: "github", name: "GitHub" },
            { id: "google", name: "Google" },
          ],
        }),
      );
    });

    expect(
      container.querySelector('[data-testid="login-site-name-skeleton"]'),
    ).toBeNull();
    expect(container.textContent).toContain("Honeycomb");
    expect(container.textContent).toContain("使用GitHub登录");
  });

  it("renders resolved setting and oauth providers after loading", async () => {
    await act(async () => {
      root.render(
        React.createElement(LoginClient, {
          setting: { siteName: { zh: "Honeycomb" } },
          providers: [{ id: "github", name: "GitHub" }],
        }),
      );
    });

    expect(container.textContent).toContain("Honeycomb");
    expect(container.textContent).toContain("使用GitHub登录");
    expect(
      container.querySelector('[data-testid="login-site-name-skeleton"]'),
    ).toBeNull();
  });

  it("shows Passkey login when WebAuthn is supported", async () => {
    vi.stubGlobal("PublicKeyCredential", class {});
    await act(async () => {
      root.render(
        React.createElement(LoginClient, {
          setting: { siteName: { zh: "Honeycomb" } },
          providers: [],
        }),
      );
    });

    expect(container.textContent).toContain("使用 Passkey 登录");
  });
});
