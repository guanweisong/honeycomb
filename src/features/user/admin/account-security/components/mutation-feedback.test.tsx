import React, { act } from "react";
import { passkeyClient } from "@better-auth/passkey/client";
import { createFetch } from "@better-fetch/fetch";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1" },
  fetch: vi.fn(),
  refetch: vi.fn(),
  passkeyState: vi.fn(),
  add: vi.fn(),
  unlink: vi.fn(),
  link: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: mocks.user }),
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));
vi.mock("@/components/Dialog", () => ({
  Dialog: ({
    open,
    onOK,
    onOpenChange,
    children,
    title,
  }: {
    open: boolean;
    onOK: () => Promise<unknown>;
    onOpenChange: (open: boolean) => void;
    children?: React.ReactNode;
    title: string;
  }) =>
    open ? (
      <div>
        <p>{title}</p>
        {children}
        <button data-testid="confirm" onClick={() => void onOK()}>
          confirm
        </button>
        <button data-testid="cancel" onClick={() => onOpenChange(false)}>
          cancel
        </button>
      </div>
    ) : null,
}));
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    $fetch: mocks.fetch,
    $store: { atoms: { listPasskeys: { get: mocks.passkeyState } } },
    passkey: { addPasskey: mocks.add },
    useListPasskeys: () => ({
      data: [{ id: "p1", name: "Laptop" }],
      isPending: false,
      refetch: mocks.refetch,
    }),
    listAccounts: async () => ({
      data: [
        { id: "a1", providerId: "github" },
        { id: "a2", providerId: "credential" },
      ],
      error: null,
    }),
    unlinkAccount: mocks.unlink,
    linkSocial: mocks.link,
  },
}));
import PasskeySettings from "@/features/user/admin/account-security/components/PasskeySettings";
import PasswordSettings from "@/features/user/admin/account-security/components/PasswordSettings";
import SessionSettings from "@/features/user/admin/account-security/components/SessionSettings";
import LinkedAccountsSettings from "@/features/user/admin/account-security/components/LinkedAccountsSettings";

describe("account mutation feedback", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user = { id: "user-1" };
    mocks.fetch.mockImplementation(async (path: string) =>
      path === "/list-sessions"
        ? {
            data: [
              { id: "s1", createdAt: "2026-01-01", expiresAt: "2027-01-01" },
              { id: "s2", createdAt: "2026-01-01", expiresAt: "2027-01-01" },
            ],
            error: null,
          }
        : { error: null },
    );
    mocks.unlink.mockResolvedValue({ error: null });
    mocks.add.mockResolvedValue({ error: null });
    mocks.refetch.mockResolvedValue(undefined);
    mocks.passkeyState.mockReturnValue({ error: null });
    vi.stubGlobal("PublicKeyCredential", class {});
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    client.clear();
    vi.unstubAllGlobals();
  });
  async function render(component: React.ReactNode) {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>{component}</QueryClientProvider>,
      ),
    );
    await act(async () => new Promise((r) => setTimeout(r, 5)));
  }
  async function click(text: string) {
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent === text)
        ?.click();
    });
  }
  async function confirm() {
    await click("confirm");
  }
  async function passwordSubmit() {
    await act(async () => {
      for (const input of container.querySelectorAll("input"))
        input.value = "password";
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
  }

  it("keeps a committed passkey deletion distinct from refresh failure", async () => {
    const atom = passkeyClient().getAtoms(
      createFetch({
        baseURL: "http://localhost",
        customFetchImpl: async () =>
          new Response(JSON.stringify({ message: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
      }),
    ).listPasskeys;
    mocks.refetch.mockImplementation(() => atom.get().refetch());
    mocks.passkeyState.mockImplementation(() => atom.get());
    await render(<PasskeySettings />);
    await click("删除");
    await confirm();
    expect(atom.get().error?.status).toBe(503);
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(await mocks.refetch.mock.results[0]?.value).toBeUndefined();
    expect(mocks.success).toHaveBeenCalledWith("Passkey 已删除");
    expect(mocks.warning).toHaveBeenCalledWith(expect.stringContaining("刷新"));
    expect(mocks.error).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="confirm"]')).toBeNull();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("reports rejected password requests as unknown without inviting retry", async () => {
    mocks.fetch.mockRejectedValue(new Error("offline"));
    await render(<PasswordSettings />);
    await passwordSubmit();
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringContaining("无法确认"),
    );
    expect(mocks.error.mock.calls.flat().join()).not.toContain("重试");
  });
  it("ignores old password completion after account replacement", async () => {
    const d = Promise.withResolvers<{ error: null }>();
    mocks.fetch.mockReturnValue(d.promise);
    await render(<PasswordSettings />);
    await passwordSubmit();
    mocks.user = { id: "user-2" };
    await render(<PasswordSettings />);
    const input = container.querySelector("input")!;
    input.value = "new account input";
    await act(async () => d.resolve({ error: null }));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(input.value).toBe("new account input");
  });
  it("does not replay registration on repeated clicks", async () => {
    const d = Promise.withResolvers<{ error: null }>();
    mocks.add.mockReturnValue(d.promise);
    await render(<PasskeySettings />);
    await act(async () => {
      const b = container.querySelector<HTMLButtonElement>(
        '[data-testid="passkey-add-button"]',
      )!;
      b.click();
      b.click();
    });
    expect(mocks.add).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve({ error: null }));
  });
  it("does not toast or refresh after unmount", async () => {
    const d = Promise.withResolvers<{ error: null }>();
    mocks.fetch.mockReturnValue(d.promise);
    await render(<PasskeySettings />);
    await click("删除");
    await confirm();
    await render(null);
    await act(async () => d.resolve({ error: null }));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
  it("keeps determinate unlink failure open without refreshing", async () => {
    mocks.unlink.mockResolvedValue({ error: { message: "denied" } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await render(<LinkedAccountsSettings providers={["github"]} />);
    await click("解除关联");
    await confirm();
    expect(mocks.error).toHaveBeenCalledWith("denied");
    expect(container.querySelector('[data-testid="confirm"]')).not.toBeNull();
    expect(invalidate).not.toHaveBeenCalled();
  });
  it("separates committed unlink from refresh failure", async () => {
    vi.spyOn(client, "invalidateQueries").mockRejectedValue(
      new Error("offline"),
    );
    await render(<LinkedAccountsSettings providers={["github"]} />);
    await click("解除关联");
    await confirm();
    expect(mocks.success).toHaveBeenCalledWith("已解除账号关联");
    expect(mocks.warning).toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });
  it("does not label successful session revocation as a mutation failure when refresh rejects", async () => {
    vi.spyOn(client, "invalidateQueries").mockRejectedValue(
      new Error("offline"),
    );
    await render(<SessionSettings />);
    await click("退出其他设备");
    await confirm();
    expect(mocks.success).toHaveBeenCalledWith("其他设备已退出登录");
    expect(mocks.warning).toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="confirm"]')).toBeNull();
  });
  it("keeps a rejected session mutation open and does not invalidate", async () => {
    mocks.fetch.mockImplementation(async (path: string) =>
      path === "/list-sessions"
        ? {
            data: [
              { id: "s1", createdAt: "2026-01-01", expiresAt: "2027-01-01" },
              { id: "s2", createdAt: "2026-01-01", expiresAt: "2027-01-01" },
            ],
            error: null,
          }
        : { error: { message: "denied" } },
    );
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await render(<SessionSettings />);
    await click("退出其他设备");
    await confirm();
    expect(mocks.error).toHaveBeenCalledWith("denied");
    expect(invalidate).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="confirm"]')).not.toBeNull();
  });
  it("suppresses completion after a passkey dialog is dismissed", async () => {
    const d = Promise.withResolvers<{ error: null }>();
    mocks.fetch.mockReturnValue(d.promise);
    await render(<PasskeySettings />);
    await click("删除");
    await confirm();
    await click("cancel");
    await act(async () => d.resolve({ error: null }));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
  it("catches an unknown unlink outcome without replay or refresh", async () => {
    mocks.unlink.mockRejectedValue(new Error("offline"));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await render(<LinkedAccountsSettings providers={["github"]} />);
    await click("解除关联");
    await confirm();
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringContaining("无法确认"),
    );
    expect(mocks.unlink).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
  it("catches an unknown social link outcome without replay", async () => {
    mocks.link.mockRejectedValue(new Error("offline"));
    await render(<LinkedAccountsSettings providers={["google"]} />);
    await click("关联");
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringContaining("无法确认"),
    );
    expect(mocks.link).toHaveBeenCalledTimes(1);
  });
});
