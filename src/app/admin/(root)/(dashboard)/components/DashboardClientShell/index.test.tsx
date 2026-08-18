import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn().mockResolvedValue(undefined),
  setData: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  push: vi.fn(),
  success: vi.fn(),
  onLogout: undefined as (() => Promise<void>) | undefined,
}));

vi.mock("@/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success },
}));

vi.mock("@/app/admin/hooks/use-site-setting", () => ({
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

vi.mock("@/packages/ui/extended/AdminLayout", () => ({
  AdminLayout: (props: { onLogout: () => Promise<void>; children: React.ReactNode }) => {
    mocks.onLogout = props.onLogout;
    return <main>{props.children}</main>;
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
    mocks.setData.mockClear();
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.push.mockClear();
    mocks.success.mockClear();
    mocks.onLogout = undefined;
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

  it("clears the cached user and redirects after a successful logout", async () => {
    render();

    await act(async () => mocks.onLogout?.());

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.setData).toHaveBeenCalledWith(undefined, undefined);
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith("登出成功");
    expect(mocks.push).toHaveBeenCalledWith("/admin/login");
  });

  it("redirects to login even when logout fails", async () => {
    mocks.signOut.mockRejectedValueOnce(new Error("network error"));
    render();

    await act(async () => mocks.onLogout?.());

    expect(mocks.push).toHaveBeenCalledWith("/admin/login");
    expect(mocks.setData).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
