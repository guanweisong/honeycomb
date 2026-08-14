import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
  usePathname: () => "/admin/account/security",
}));

vi.mock("../PasskeySettings", () => ({
  default: () => React.createElement("div", null, "Passkey settings"),
}));
vi.mock("../PasswordSettings", () => ({
  default: () => React.createElement("div", null, "Password settings"),
}));
vi.mock("../SessionSettings", () => ({
  default: () => React.createElement("div", null, "Session settings"),
}));
vi.mock("../LinkedAccountsSettings", () => ({
  default: () => React.createElement("div", null, "Linked accounts settings"),
}));
vi.mock("../LoginHistorySettings", () => ({
  default: () => React.createElement("div", null, "Login history settings"),
}));

import { AccountSecurityTabs } from "./index";

describe("AccountSecurityTabs", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    push.mockReset();
    searchParams.delete("tab");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("uses the tab query parameter as the initial selection", async () => {
    searchParams.set("tab", "sessions");

    await act(async () =>
      root.render(
        React.createElement(AccountSecurityTabs, {
          socialProviders: ["google"],
        }),
      ),
    );

    expect(container.querySelector('[role="tab"][data-state="active"]')?.textContent).toBe(
      "登录会话",
    );
    expect(container.textContent).toContain("Session settings");
  });

  it("falls back to Passkey for an unsupported tab query parameter", async () => {
    searchParams.set("tab", "unknown");

    await act(async () =>
      root.render(
        React.createElement(AccountSecurityTabs, {
          socialProviders: ["google"],
        }),
      ),
    );

    expect(container.querySelector('[role="tab"][data-state="active"]')?.textContent).toBe(
      "Passkey",
    );
  });

  it("writes the selected tab to the URL without scrolling", async () => {
    await act(async () =>
      root.render(
        React.createElement(AccountSecurityTabs, {
          socialProviders: ["google"],
        }),
      ),
    );

    await act(async () => {
      container
        .querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]
        ?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    });

    expect(push).toHaveBeenCalledWith("/admin/account/security?tab=sessions", {
      scroll: false,
    });
  });
});
