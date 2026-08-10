import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPasskeys: vi.fn(),
  refetch: vi.fn(),
  addPasskey: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/auth-client", () => ({
  authClient: {
    useListPasskeys: () => mocks.listPasskeys(),
    passkey: { addPasskey: mocks.addPasskey },
    $fetch: mocks.fetch,
  },
}));

import PasskeySettings from "./PasskeySettings";

describe("PasskeySettings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.listPasskeys.mockReturnValue({
      data: [
        {
          id: "passkey-1",
          name: "MacBook",
          deviceType: "singleDevice",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      isPending: false,
      refetch: mocks.refetch,
    });
    mocks.addPasskey.mockResolvedValue({ data: { id: "passkey-2" }, error: null });
    mocks.fetch.mockResolvedValue({ data: {}, error: null });
    mocks.refetch.mockResolvedValue(undefined);
    vi.stubGlobal("PublicKeyCredential", class {});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists passkeys and registers a named passkey", async () => {
    await act(async () => root.render(React.createElement(PasskeySettings)));

    expect(container.querySelector("section")?.className).toContain("pb-6");
    expect(container.textContent).toContain("MacBook");
    const nameInput = container.querySelector<HTMLInputElement>(
      '[data-testid="passkey-name-input"]',
    );
    const addButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="passkey-add-button"]',
    );
    expect(nameInput).not.toBeNull();
    expect(addButton).not.toBeNull();

    await act(async () => {
      nameInput!.value = "iPhone";
      nameInput!.dispatchEvent(new Event("change", { bubbles: true }));
      addButton!.click();
    });

    expect(mocks.addPasskey).toHaveBeenCalledWith({ name: "iPhone" });
  });

  it("hides passkey controls when WebAuthn is unavailable", async () => {
    vi.stubGlobal("PublicKeyCredential", undefined);

    await act(async () => root.render(React.createElement(PasskeySettings)));

    expect(
      container.querySelector('[data-testid="passkey-add-button"]'),
    ).toBeNull();
    expect(container.textContent).toContain("当前浏览器不支持 Passkey");
  });

  it("shows shadcn skeletons while passkeys are loading", async () => {
    mocks.listPasskeys.mockReturnValue({ data: null, isPending: true });

    await act(async () => root.render(React.createElement(PasskeySettings)));

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain("正在加载 Passkey");
  });

  it("renames a passkey through the dialog and refreshes the list", async () => {
    await act(async () => root.render(React.createElement(PasskeySettings)));

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="passkey-rename-button"]',
        )
        ?.click();
    });

    const renameInput = document.querySelector<HTMLInputElement>(
      '[data-testid="passkey-rename-input"]',
    );
    expect(renameInput).not.toBeNull();
    const setInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setInputValue.call(renameInput, "办公室 Mac");
    renameInput!.dispatchEvent(new Event("input", { bubbles: true }));

    await act(async () => {
      const submitButton = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent?.includes("保存"),
      );
      submitButton?.click();
    });

    expect(mocks.fetch).toHaveBeenCalledWith("/passkey/update-passkey", {
      method: "POST",
      body: { id: "passkey-1", name: "办公室 Mac" },
    });
    expect(mocks.refetch).toHaveBeenCalled();
  });
});
