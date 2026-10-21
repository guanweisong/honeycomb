import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolbarLinkItem } from "./ToolbarLinkItem";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarGroupItem } from "./ToolbarGroupItem";

describe("real toolbar control semantics", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: Editor;
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    editor = new Editor({ extensions: [StarterKit], content: "<p>Text</p>" });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    editor.destroy();
    container.remove();
    vi.unstubAllGlobals();
  });
  it.each([true, false, undefined])(
    "names buttons and preserves pressed=%s",
    async (active) => {
      await act(async () =>
        root.render(
          <ToolbarButton label="加粗" icon={<svg />} active={active} />,
        ),
      );
      const button = container.querySelector('button[aria-label="加粗"]');
      expect(button).not.toBeNull();
      expect(button?.getAttribute("aria-pressed")).toBe(
        active === undefined ? null : String(active),
      );
    },
  );
  it("names the real link URL input when the popover opens", async () => {
    await act(async () => root.render(<ToolbarLinkItem editor={editor} />));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="超链接"]')
        ?.click(),
    );
    const input = document.body.querySelector('input[aria-label="链接地址"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute("type")).toBe("url");
    expect(input?.getAttribute("spellcheck")).toBe("false");
  });

  it("names a group trigger without overriding Radix expansion state", async () => {
    await act(async () =>
      root.render(
        <ToolbarGroupItem
          editor={editor}
          group={{
            label: "格式",
            icon: <svg />,
            items: [
              {
                label: "加粗",
                icon: <svg />,
                onClick: (editor) => editor.commands.toggleBold(),
              },
            ],
          }}
        />,
      ),
    );
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="格式"]',
    );
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    await act(async () =>
      trigger?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    const item = document.querySelector<HTMLElement>('[role="menuitem"]');
    expect(item?.textContent).toContain("加粗");
    await act(async () => item?.click());
    expect(editor.isActive("bold")).toBe(true);
  });
});
