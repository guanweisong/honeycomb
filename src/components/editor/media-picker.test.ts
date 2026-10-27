import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  TiptapMediaPickerProvider,
  type MediaPickerRenderer,
} from "@/components/editor/media-picker";
import { ToolbarImageItem } from "@/components/editor/components/ToolbarImageItem";

describe("Tiptap media picker", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: Editor;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    editor = new Editor({
      extensions: [StarterKit, Image],
      content: "<p></p>",
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    editor.destroy();
    container.remove();
  });

  it("inserts an image through the injected picker using the real editor command", async () => {
    const renderer: MediaPickerRenderer = ({ open, kind, onConfirm }) =>
      open
        ? React.createElement(
            "button",
            {
              "data-testid": "confirm-media",
              onClick: () => onConfirm({ url: "https://cdn.test/media.jpg" }),
            },
            kind,
          )
        : null;
    await act(async () =>
      root.render(
        React.createElement(
          TiptapMediaPickerProvider,
          { renderer },
          React.createElement(ToolbarImageItem, { editor }),
        ),
      ),
    );
    await act(async () => container.querySelector("button")?.click());
    expect(
      container.querySelector('[data-testid="confirm-media"]')?.textContent,
    ).toBe("image");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-testid="confirm-media"]')
        ?.click(),
    );
    expect(editor.getHTML()).toContain('src="https://cdn.test/media.jpg"');
    expect(container.querySelector('[data-testid="confirm-media"]')).toBeNull();
  });
});
