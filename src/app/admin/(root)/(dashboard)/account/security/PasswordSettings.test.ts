import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/auth-client", () => ({
  authClient: { $fetch: mocks.fetch },
}));

import PasswordSettings from "./PasswordSettings";

describe("PasswordSettings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.fetch.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it("changes the password and revokes other sessions", async () => {
    await act(async () => root.render(React.createElement(PasswordSettings)));

    const section = container.querySelector("section");
    expect(section?.className).toContain("pb-6");
    expect(section?.className).not.toContain("border-t");
    expect(section?.className).not.toContain("pt-6");
    expect(container.querySelector("h2")).toBeNull();

    const setValue = (testId: string, value: string) => {
      const input = container.querySelector<HTMLInputElement>(
        `[data-testid="${testId}"]`,
      );
      expect(input).not.toBeNull();
      input!.value = value;
    };

    setValue("current-password-input", "old-password");
    setValue("new-password-input", "new-password");
    setValue("confirm-password-input", "new-password");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="change-password-button"]',
        )
        ?.click();
    });

    expect(mocks.fetch).toHaveBeenCalledWith("/change-password", {
      method: "POST",
      body: {
        currentPassword: "old-password",
        newPassword: "new-password",
        revokeOtherSessions: true,
      },
    });
  });

  it("requires passwords to be at least 6 characters", async () => {
    await act(async () => root.render(React.createElement(PasswordSettings)));

    const newPassword = container.querySelector<HTMLInputElement>(
      '[data-testid="new-password-input"]',
    );
    const confirmPassword = container.querySelector<HTMLInputElement>(
      '[data-testid="confirm-password-input"]',
    );

    expect(newPassword?.minLength).toBe(6);
    expect(confirmPassword?.minLength).toBe(6);
    expect(newPassword?.placeholder).toContain("至少 6 位");
  });
});
