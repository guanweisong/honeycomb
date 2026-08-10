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
});
