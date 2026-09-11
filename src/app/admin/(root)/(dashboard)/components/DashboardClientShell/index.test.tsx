import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn(),
  clearRuntimeCaches: vi.fn().mockResolvedValue(undefined),
  navigateToLogin: vi.fn(),
  setData: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  push: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  onLogout: undefined as (() => Promise<void>) | undefined,
}));

const navigation = vi.hoisted(() => ({ pathname: "/admin/dashboard" }));

vi.mock("@/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => navigation.pathname,
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success },
}));

vi.mock("@/features/setting/admin/hooks-use-site-setting", () => ({
  useSiteSetting: () => ({
    setting: {
      siteName: { zh: "Honeycomb" },
      siteSignature: { zh: "管理后台" },
    },
  }),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({
      user: {
        current: {
          setData: mocks.setData,
          invalidate: mocks.invalidate,
        },
      },
    }),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: mocks.clear }),
}));

vi.mock("./logout-browser-state", () => ({
  clearHoneycombRuntimeCaches: mocks.clearRuntimeCaches,
  navigateToAdminLogin: mocks.navigateToLogin,
}));

vi.mock("@/packages/ui/extended/AdminLayout", () => ({
  AdminLayout: (props: {
    onLogout: () => Promise<void>;
    children: React.ReactNode;
    pendingPath?: string | null;
    onNavigateStart?: (path: string) => void;
  }) => {
    mocks.onLogout = props.onLogout;
    return (
      <main>
        <button
          type="button"
          onClick={() => props.onNavigateStart?.("/admin/tag")}
        >
          标签
        </button>
        <output aria-label="pending route">{props.pendingPath}</output>
        {props.children}
      </main>
    );
  },
}));

import { DashboardClientShell } from ".";

const user = {
  id: "user-1",
  level: "ADMIN",
  email: "admin@example.test",
  status: "ENABLE",
  name: "Admin",
} as never;

describe("DashboardClientShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.invalidate.mockClear();
    mocks.clear.mockClear();
    mocks.clearRuntimeCaches.mockReset().mockResolvedValue(undefined);
    mocks.navigateToLogin.mockClear();
    mocks.setData.mockClear();
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
    mocks.push.mockClear();
    mocks.success.mockClear();
    mocks.error.mockClear();
    mocks.onLogout = undefined;
    navigation.pathname = "/admin/dashboard";
  });

  function render() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <DashboardClientShell user={user}>
          <span>dashboard</span>
        </DashboardClientShell>,
      ),
    );
  }

  it("marks only the destination menu while navigation is pending", async () => {
    render();

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(
      container.querySelector('output[aria-label="pending route"]')
        ?.textContent,
    ).toBe("/admin/tag");

    navigation.pathname = "/admin/tag";
    await act(async () => {
      root.render(
        <DashboardClientShell user={user}>
          <span>tag</span>
        </DashboardClientShell>,
      );
    });

    expect(
      container.querySelector('output[aria-label="pending route"]')
        ?.textContent,
    ).toBe("");
  });

  it("does not leave a pending marker when the current menu is clicked", async () => {
    navigation.pathname = "/admin/tag";
    render();

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(
      container.querySelector('output[aria-label="pending route"]')
        ?.textContent,
    ).toBe("");
  });

  it("clears browser and query caches before hard navigation after logout", async () => {
    render();

    await act(async () => mocks.onLogout?.());

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.setData).toHaveBeenCalledWith(undefined, undefined);
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.clearRuntimeCaches).toHaveBeenCalledTimes(1);
    expect(mocks.clear).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith("登出成功");
    expect(mocks.navigateToLogin).toHaveBeenCalledTimes(1);
  });

  it("continues logout after post-success browser cache cleanup fails", async () => {
    mocks.clearRuntimeCaches.mockRejectedValueOnce(
      new Error("cache unavailable"),
    );
    render();

    await act(async () => mocks.onLogout?.());

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.setData).toHaveBeenCalledWith(undefined, undefined);
    expect(mocks.clear).toHaveBeenCalledTimes(1);
    expect(mocks.navigateToLogin).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith("登出成功");
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("does not clear state, redirect, or claim success when logout fails", async () => {
    mocks.signOut.mockRejectedValueOnce(new Error("network error"));
    render();

    await act(async () => mocks.onLogout?.());

    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.setData).not.toHaveBeenCalled();
    expect(mocks.clearRuntimeCaches).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.navigateToLogin).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("登出失败");
  });

  it("leaves browser Cache Storage untouched when sign-out resolves with an error", async () => {
    mocks.signOut.mockResolvedValueOnce({
      error: { message: "sign-out failed" },
    });
    render();

    await act(async () => mocks.onLogout?.());

    expect(mocks.clearRuntimeCaches).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.navigateToLogin).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("sign-out failed");
  });
});
