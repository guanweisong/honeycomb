import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./PasskeySettings", () => ({
  default: () => React.createElement("div", null, "Passkey settings"),
}));
vi.mock("./PasswordSettings", () => ({
  default: () => React.createElement("div", null, "Password settings"),
}));
vi.mock("./SessionSettings", () => ({
  default: () => React.createElement("div", null, "Session settings"),
}));

import AccountSecurityPage from "./page";

describe("AccountSecurityPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("uses the same 60 percent centered content width as settings", async () => {
    await act(async () => root.render(React.createElement(AccountSecurityPage)));

    expect(container.firstElementChild?.className).toBe(
      "w-full mx-auto lg:w-[60%]",
    );
    expect(container.querySelector("h1")).toBeNull();
  });

  it("organizes security settings into tabs with Passkey selected by default", async () => {
    await act(async () => root.render(React.createElement(AccountSecurityPage)));

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]?.textContent).toContain("Passkey");
    expect(tabs[1]?.textContent).toContain("修改密码");
    expect(tabs[2]?.textContent).toContain("登录会话");
    expect(tabs[0]?.getAttribute("data-state")).toBe("active");
    expect(container.querySelector('[data-slot="tabs-content"]')?.className).toContain(
      "pt-6",
    );
    expect(container.textContent).toContain("Passkey settings");
  });
});
