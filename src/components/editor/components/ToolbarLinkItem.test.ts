import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const inputMocks = vi.hoisted(() => ({
  onChange: undefined as
    ((event: { target: { value: string } }) => void) | undefined,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement("button", props, children),
}));
vi.mock("@/components/ui/input", () => ({
  Input: ({ onChange, ...props }: Record<string, unknown>) => {
    inputMocks.onChange = onChange as typeof inputMocks.onChange;
    return React.createElement("input", { ...props, onChange });
  },
}));
vi.mock("@/components/editor/components/ToolbarButton", () => ({
  ToolbarButton: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) =>
    React.createElement(
      "div",
      null,
      React.createElement(
        "button",
        { onClick: () => onOpenChange?.(true) },
        "link",
      ),
      children,
    ),
}));

import { ToolbarLinkItem } from "@/components/editor/components/ToolbarLinkItem";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ToolbarLinkItem", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: Editor;
  beforeEach(() => {
    editor = new Editor({ extensions: [StarterKit], content: "<p>Text</p>" });
    editor.commands.selectAll();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    editor.destroy();
    container.remove();
  });

  it("applies a new link URL", async () => {
    await act(async () =>
      root.render(React.createElement(ToolbarLinkItem, { editor })),
    );
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
    expect(editor.getAttributes("link").href).toBe("https://example.com");
  });
  it("snapshots the selected link on each opening and keeps cancellation non-mutating", async () => {
    editor.commands.setLink({ href: "https://first.test" });
    await act(async () =>
      root.render(React.createElement(ToolbarLinkItem, { editor })),
    );
    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("input")?.value).toBe("https://first.test");
    await act(async () =>
      inputMocks.onChange?.({ target: { value: "https://discard.test" } }),
    );
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "取消")
        ?.click(),
    );
    expect(editor.getAttributes("link").href).toBe("https://first.test");
    await act(async () =>
      editor.commands.setLink({ href: "https://second.test" }),
    );
    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("input")?.value).toBe("https://second.test");
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "移除")
        ?.click(),
    );
    expect(editor.getAttributes("link").href).toBeUndefined();
    expect(editor.getText()).toBe("Text");
  });
});
