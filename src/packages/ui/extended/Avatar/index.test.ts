import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../components/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  AvatarImage: (props: Record<string, unknown>) => React.createElement("img", props),
  AvatarFallback: ({ children, ...props }: { children: React.ReactNode }) => React.createElement("span", props, children),
  AvatarBadge: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("span", props, children),
  AvatarGroup: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  AvatarGroupCount: ({ children }: { children: React.ReactNode }) => React.createElement("span", null, children),
}));

import Avatar from "./index";

describe("Avatar", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("renders initials and status when no image is provided", async () => {
    await act(async () => root.render(React.createElement(Avatar, { name: "Jane Doe", status: "online" })));
    expect(container.textContent).toContain("JD");
    expect(container.querySelector('[aria-label="status-online"]')?.className).toContain("bg-emerald-500");
  });

  it("renders the image source and explicit fallback", async () => {
    await act(async () => root.render(React.createElement(Avatar, { url: "/avatar.png", fallback: "A" })));
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/avatar.png");
    expect(container.textContent).toContain("A");
  });
});
