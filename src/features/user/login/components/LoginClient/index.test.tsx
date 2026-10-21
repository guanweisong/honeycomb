import React, { act } from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { createFetch } from "@better-fetch/fetch";

const mockFetch = vi.fn();
const mocks = vi.hoisted(() => ({
  social: vi.fn().mockResolvedValue({ error: null }),
  passkey: vi.fn(),
  username: vi.fn(),
  siteKey: undefined as string | undefined,
  captchaOnSuccess: undefined as ((token: string) => void) | undefined,
  captchaOnExpire: undefined as (() => void) | undefined,
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
  default: ({ src, id }: { src: string; id: string }) =>
    React.createElement("script", { src, id }),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../provider-icons", () => ({
  providerIcons: {
    github: React.createElement("span", null, "github"),
  },
}));

import LoginClient from "./index";
import { toast } from "sonner";

describe("admin login page", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockFetch.mockReset();
    mocks.social.mockReset().mockResolvedValue({ error: null });
    mocks.siteKey = undefined;
    mocks.captchaOnSuccess = undefined;
    mocks.captchaOnExpire = undefined;
    mocks.username.mockReset();
    mocks.passkey.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.info).mockClear();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([undefined, "site-key"])(
    "loads exactly one captcha script only when enabled: %s",
    async (siteKey) => {
      mocks.siteKey = siteKey;
      await act(async () =>
        root.render(
          React.createElement(LoginClient, {
            setting: undefined,
            providers: [],
          }),
        ),
      );
      expect(
        container.querySelectorAll(
          'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
        ),
      ).toHaveLength(siteKey ? 1 : 0);
    },
  );

  it.each(["social", "passkey"] as const)(
    "reports returned %s errors and releases pending state",
    async (method) => {
      vi.stubGlobal("PublicKeyCredential", class {});
      mocks[method].mockResolvedValue({
        error: { message: "Provider unavailable" },
      });
      await act(async () =>
        root.render(
          React.createElement(LoginClient, {
            setting: undefined,
            providers: [{ id: "github", name: "GitHub" }],
          }),
        ),
      );
      const button = Array.from(container.querySelectorAll("button")).find(
        (b) =>
          b.textContent?.includes(
            method === "social" ? "使用GitHub登录" : "使用 Passkey 登录",
          ),
      );
      await act(async () => button?.click());
      expect(toast.error).toHaveBeenCalledWith("Provider unavailable");
      expect(button?.disabled).toBe(false);
    },
  );

  it.each(["social", "passkey"] as const)(
    "prevents duplicate %s attempts while pending",
    async (method) => {
      vi.stubGlobal("PublicKeyCredential", class {});
      let resolve!: (value: unknown) => void;
      mocks[method].mockImplementation(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      await act(async () =>
        root.render(
          React.createElement(LoginClient, {
            setting: undefined,
            providers: [{ id: "github", name: "GitHub" }],
          }),
        ),
      );
      const button = Array.from(container.querySelectorAll("button")).find(
        (b) =>
          b.textContent?.includes(
            method === "social" ? "使用GitHub登录" : "使用 Passkey 登录",
          ),
      );
      await act(async () => {
        button?.click();
        button?.click();
      });
      expect(mocks[method]).toHaveBeenCalledTimes(1);
      expect(button?.disabled).toBe(true);
      await act(async () => resolve({ error: { message: "Stopped" } }));
      expect(button?.disabled).toBe(false);
    },
  );

  it.each(["social", "passkey"] as const)(
    "catches rejected %s requests and restores the button",
    async (method) => {
      vi.stubGlobal("PublicKeyCredential", class {});
      mocks[method].mockRejectedValue(new Error("Network unavailable"));
      await act(async () =>
        root.render(
          React.createElement(LoginClient, {
            setting: undefined,
            providers: [{ id: "github", name: "GitHub" }],
          }),
        ),
      );
      const button = Array.from(container.querySelectorAll("button")).find(
        (b) =>
          b.textContent?.includes(
            method === "social" ? "使用GitHub登录" : "使用 Passkey 登录",
          ),
      );
      await act(async () => button?.click());
      expect(toast.error).toHaveBeenCalledWith(
        method === "social"
          ? "无法完成第三方登录，请稍后重试"
          : "无法完成 Passkey 登录，请稍后重试",
      );
      expect(button?.disabled).toBe(false);
    },
  );

  it.each(["AbortError", "NotAllowedError"])(
    "does not label %s cancellation as a security failure",
    async (name) => {
      vi.stubGlobal("PublicKeyCredential", class {});
      mocks.passkey.mockRejectedValue(new DOMException("Cancelled", name));
      await act(async () =>
        root.render(
          React.createElement(LoginClient, {
            setting: undefined,
            providers: [],
          }),
        ),
      );
      await act(async () =>
        Array.from(container.querySelectorAll("button"))
          .find((b) => b.textContent?.includes("使用 Passkey 登录"))
          ?.click(),
      );
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith("Passkey 登录未完成，可重试");
    },
  );

  it.each([
    "AUTH_CANCELLED",
    "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
    "ERROR_CEREMONY_ABORTED",
  ])(
    "handles returned SDK interruption %s without assuming explicit cancellation",
    async (code) => {
      vi.stubGlobal("PublicKeyCredential", class {});
      mocks.passkey.mockResolvedValue({
        data: null,
        error: {
          code,
          message: "Auth cancelled",
          status: 400,
          statusText: "BAD_REQUEST",
        },
      });
      await act(async () =>
        root.render(
          React.createElement(LoginClient, {
            setting: undefined,
            providers: [],
          }),
        ),
      );
      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.includes("使用 Passkey 登录"),
      );
      await act(async () => button?.click());
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith("Passkey 登录未完成，可重试");
      expect(button?.disabled).toBe(false);
    },
  );

  it.each([
    "ERROR_INVALID_DOMAIN",
    "ERROR_INVALID_RP_ID",
    "ERROR_AUTHENTICATOR_GENERAL_ERROR",
  ])("keeps returned %s as an error", async (code) => {
    vi.stubGlobal("PublicKeyCredential", class {});
    mocks.passkey.mockResolvedValue({
      data: null,
      error: {
        code,
        message: "Authenticator configuration failed",
        status: 400,
        statusText: "BAD_REQUEST",
      },
    });
    await act(async () =>
      root.render(
        React.createElement(LoginClient, { setting: undefined, providers: [] }),
      ),
    );
    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.includes("使用 Passkey 登录"))
        ?.click(),
    );
    expect(toast.error).toHaveBeenCalledWith(
      "Authenticator configuration failed",
    );
    expect(toast.info).not.toHaveBeenCalled();
  });

  it.each([
    ["NotAllowedError", "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY"],
    ["AbortError", "ERROR_CEREMONY_ABORTED"],
  ])("handles actual installed SDK mapping for %s", async (name, code) => {
    vi.stubGlobal("PublicKeyCredential", class {});
    const getCredential = vi
      .fn()
      .mockRejectedValue(
        new DOMException("Authentication not completed", name),
      );
    vi.stubGlobal("navigator", { credentials: { get: getCredential } });
    const fetchOptions = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            challenge: "AA",
            rpId: "localhost",
            allowCredentials: [],
          }),
          { headers: { "content-type": "application/json" } },
        ),
    );
    const actions = passkeyClient().getActions(
      createFetch({
        baseURL: "https://example.test",
        customFetchImpl: fetchOptions,
      }),
      { notify: vi.fn(), listen: vi.fn(), atoms: {} },
    );
    mocks.passkey.mockImplementation(() => actions.signIn.passkey());
    await act(async () =>
      root.render(
        React.createElement(LoginClient, { setting: undefined, providers: [] }),
      ),
    );
    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.includes("使用 Passkey 登录"))
        ?.click(),
    );
    await expect(mocks.passkey.mock.results[0]?.value).resolves.toMatchObject({
      data: null,
      error: { code, status: 400 },
    });
    expect(fetchOptions).toHaveBeenCalledOnce();
    expect(getCredential).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Passkey 登录未完成，可重试");
  });

  it("uses a bounded, scrollable login card instead of offscreen fixed positioning", async () => {
    await act(async () =>
      root.render(<LoginClient setting={undefined} providers={[]} />),
    );
    const card = container.querySelector("h1")?.parentElement;
    expect(card?.className).toContain("w-full");
    expect(card?.className).toContain("max-w-96");
    expect(card?.className).not.toContain("fixed");
    expect(card?.parentElement?.className).toContain("min-h-dvh");
  });

  it("starts no video for reduced motion and supports preference changes and a keyboard pause control", async () => {
    const query = Object.assign(new EventTarget(), { matches: false });
    const matchMedia = vi.fn(() => query);
    vi.stubGlobal("matchMedia", matchMedia);
    await act(async () =>
      root.render(<LoginClient setting={undefined} providers={[]} />),
    );
    expect(matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: no-preference)",
    );
    expect(container.querySelector("video")).toBeNull();
    await act(async () => {
      query.matches = true;
      query.dispatchEvent(new Event("change"));
    });
    expect(container.querySelector("video")?.autoplay).toBe(true);
    const pause = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "暂停背景动画",
    );
    expect(pause).toBeDefined();
    await act(async () => {
      pause?.focus();
      pause?.click();
    });
    expect(document.activeElement).toBe(pause);
    expect(container.querySelector("video")).toBeNull();
    await act(async () => pause?.click());
    expect(container.querySelector("video")).not.toBeNull();
    await act(async () => {
      query.matches = false;
      query.dispatchEvent(new Event("change"));
    });
    expect(container.querySelector("video")).toBeNull();
  });
  it("associates login labels and autocomplete with the real inputs", async () => {
    await act(async () =>
      root.render(<LoginClient setting={undefined} providers={[]} />),
    );
    for (const [name, label, purpose] of [
      ["name", "用户名", "username"],
      ["password", "密码", "current-password"],
    ]) {
      const input = container.querySelector(`input[name="${name}"]`);
      expect(
        document.getElementById(input?.getAttribute("aria-labelledby") ?? "")
          ?.textContent,
      ).toBe(label);
      expect(input?.getAttribute("autocomplete")).toBe(purpose);
    }
  });

  it("navigates successful passkey login only to the safe callback", async () => {
    vi.stubGlobal("PublicKeyCredential", class {});
    mocks.passkey.mockResolvedValue({ error: null });
    await act(async () =>
      root.render(
        React.createElement(LoginClient, {
          setting: undefined,
          providers: [],
          targetUrl: "https://evil.test",
        }),
      ),
    );
    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.includes("使用 Passkey 登录"))
        ?.click(),
    );
    expect(toast.success).toHaveBeenCalledWith("登录成功");
    expect(window.location.href).toBe("/admin/dashboard");
  });

  it("treats passkey cancellation as a neutral status", async () => {
    vi.stubGlobal("PublicKeyCredential", class {});
    mocks.passkey.mockResolvedValue({
      error: { code: "AUTH_CANCELLED", message: "Cancelled" },
    });
    await act(async () =>
      root.render(
        React.createElement(LoginClient, { setting: undefined, providers: [] }),
      ),
    );
    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent?.includes("使用 Passkey 登录"))
        ?.click(),
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Passkey 登录未完成，可重试");
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
