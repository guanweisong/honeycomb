import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  AvatarImage: (props: Record<string, unknown>) =>
    React.createElement("img", props),
  AvatarFallback: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement("span", props, children),
  AvatarBadge: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("span", props, children),
  AvatarGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  AvatarGroupCount: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

import Avatar from "@/components/Avatar/index";

describe("Avatar", () => {
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

  it("renders a fallback when no image is provided", async () => {
    await act(async () =>
      root.render(React.createElement(Avatar, { fallback: "Jane" })),
    );
    expect(container.textContent).toBe("Jane");
    expect(container.querySelector("img")).toBeNull();
  });

  it.each([undefined, null])(
    "keeps the placeholder for a %s name",
    async (fallback) => {
      await act(async () =>
        root.render(React.createElement(Avatar, { fallback })),
      );
      expect(container.textContent).toBe("?");
    },
  );

  it("renders the image source and explicit fallback", async () => {
    await act(async () =>
      root.render(
        React.createElement(Avatar, {
          src: "/avatar.png",
          alt: "Jane",
          fallback: "A",
        }),
      ),
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/avatar.png",
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("Jane");
    expect(container.textContent).toContain("A");
  });
});
