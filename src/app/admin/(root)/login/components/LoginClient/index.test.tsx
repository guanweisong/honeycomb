import React, { act } from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockUseSiteSetting = vi.fn();
const mockRefreshUser = vi.fn();
const mockFetch = vi.fn();
const mocks = vi.hoisted(() => ({
  social: vi.fn().mockResolvedValue({ error: null }),
  passkey: vi.fn(),
  username: vi.fn(),
  siteKey: undefined as string | undefined,
  captchaOnSuccess: undefined as ((token: string) => void) | undefined,
  captchaOnExpire: undefined as (() => void) | undefined,
}));

vi.mock("@/features/setting/admin/hooks-use-site-setting", () => ({
  useSiteSetting: () => mockUseSiteSetting(),
}));

vi.mock("@/packages/ui/admin/use-current-user", () => ({
  useCurrentUser: () => ({
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock("@/auth-client", () => ({
  authClient: {
    signIn: {
      username: mocks.username,
      social: mocks.social,
      passkey: mocks.passkey,
    },
    signOut: vi.fn(),
  },
}));

vi.mock("@/env/client", () => ({
  clientEnv: {
    NEXT_PUBLIC_SITE_URL: "https://honeycomb.test",
    NEXT_PUBLIC_ASSET_URL: "https://assets.honeycomb.test",
    get NEXT_PUBLIC_TURNSTILE_SITE_KEY() {
      return mocks.siteKey;
    },
  },
}));

vi.mock("@marsidev/react-turnstile", () => ({
  DEFAULT_SCRIPT_ID: "cf-turnstile-script",
  SCRIPT_URL: "https://challenges.cloudflare.com/turnstile/v0/api.js",
  Turnstile: ({
    onSuccess,
    onExpire,
  }: {
    onSuccess: (token: string) => void;
    onExpire: () => void;
  }) => {
    mocks.captchaOnSuccess = onSuccess;
    mocks.captchaOnExpire = onExpire;
    return null;
  },
}));

vi.mock("next/script", () => ({
  default: () => null,
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

vi.mock("./provider-icons", () => ({
  providerIcons: {
    github: React.createElement("span", null, "github"),
  },
}));

import LoginClient from "./index";

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
    mocks.social.mockReset().mockResolvedValue({ error: null });
    mocks.siteKey = undefined;
    mocks.captchaOnSuccess = undefined;
    mocks.captchaOnExpire = undefined;
    mocks.username.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("disables login until captcha success and disables it again on expiry", async () => {
    mocks.siteKey = "1x00000000000000000000AA";
    await act(async () => {
      root.render(
        React.createElement(LoginClient, { setting: undefined, providers: [] }),
      );
    });

    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(submit?.disabled).toBe(true);
    expect(mocks.captchaOnSuccess).toBeTypeOf("function");

    await act(async () => {
      mocks.captchaOnSuccess?.("XXXX.DUMMY.TOKEN.XXXX");
    });

    expect(submit?.disabled).toBe(false);
    await act(async () => {
      mocks.captchaOnExpire?.();
    });
    expect(submit?.disabled).toBe(true);
  });

  it("keeps the real form disabled while a ready login request is pending", async () => {
    mocks.siteKey = "1x00000000000000000000AA";
    let finishLogin!: (result: { error: { message: string } }) => void;
    mocks.username.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishLogin = resolve;
        }),
    );
    await act(async () => {
      root.render(
        React.createElement(LoginClient, { setting: undefined, providers: [] }),
      );
    });
    await act(async () => {
      mocks.captchaOnSuccess?.("XXXX.DUMMY.TOKEN.XXXX");
    });

    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    for (const [placeholder, value] of [
      ["用户名", "guest"],
      ["密码", "123456"],
    ]) {
      const input = container.querySelector<HTMLInputElement>(
        `input[placeholder="${placeholder}"]`,
      );
      if (!input) throw new Error(`Missing ${placeholder} input`);
      await act(async () => {
        setValue?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    await act(async () => {
      submit?.click();
    });
    expect(mocks.username).toHaveBeenCalledWith({
      username: "guest",
      password: "123456",
      fetchOptions: {
        headers: { "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX" },
      },
    });
    expect(submit?.disabled).toBe(true);
    expect(submit?.textContent).toContain("处理中");

    await act(async () => {
      finishLogin({ error: { message: "Invalid credentials" } });
    });
    // A completed attempt resets the captcha, so another token is required.
    expect(submit?.disabled).toBe(true);
  });

  it("does not require a captcha token when the integration is disabled", async () => {
    await act(async () => {
      root.render(
        React.createElement(LoginClient, { setting: undefined, providers: [] }),
      );
    });

    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(false);
    expect(mocks.captchaOnSuccess).toBeUndefined();
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

  it("uses the dashboard fallback for an unsafe OAuth callback", async () => {
    await act(async () => {
      root.render(
        React.createElement(LoginClient, {
          setting: { siteName: { zh: "Honeycomb" } },
          providers: [{ id: "github", name: "GitHub" }],
          targetUrl: "//evil.test",
        }),
      );
    });

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("使用GitHub登录"))
        ?.click();
    });

    expect(mocks.social).toHaveBeenCalledWith({
      provider: "github",
      callbackURL: "/admin/dashboard",
    });
  });
});
