import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const inputMocks = vi.hoisted(() => ({ onChange: undefined as ((event: { target: { value: string } }) => void) | undefined }));

vi.mock("@/packages/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => React.createElement("button", props, children),
}));
vi.mock("@/packages/ui/components/input", () => ({
  Input: ({ onChange, ...props }: Record<string, unknown>) => {
    inputMocks.onChange = onChange as typeof inputMocks.onChange;
    return React.createElement("input", { ...props, onChange });
  },
}));
vi.mock("./ToolbarButton", () => ({
  ToolbarButton: ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange?: (open: boolean) => void }) =>
    React.createElement("div", null,
      React.createElement("button", { onClick: () => onOpenChange?.(true) }, "link"),
      children,
    ),
}));

import { ToolbarLinkItem } from "./ToolbarLinkItem";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ToolbarLinkItem", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("applies a new link URL", async () => {
    const run = vi.fn();
    const setLink = vi.fn(() => ({ run }));
    const editor = { getAttributes: vi.fn(() => ({})), isActive: vi.fn(() => false), chain: vi.fn(() => ({ focus: () => ({ extendMarkRange: () => ({ setLink }) }) })) };
    await act(async () => root.render(React.createElement(ToolbarLinkItem, { editor: editor as never })));
    await act(async () => container.querySelector("button")?.click());
    await act(async () => {
      inputMocks.onChange?.({ target: { value: "https://example.com" } });
    });
    await act(async () => {
      const apply = [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "应用",
      );
      apply?.click();
    });
    expect(setLink).toHaveBeenCalledWith({ href: "https://example.com" });
    expect(run).toHaveBeenCalledOnce();
  });
});
