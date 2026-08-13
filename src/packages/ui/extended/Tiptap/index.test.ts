import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tiptapMocks = vi.hoisted(() => ({
  config: undefined as
    | { onUpdate?: (event: { editor: { getHTML: () => string } }) => void }
    | undefined,
  editor: {
    getHTML: () => "<p>当前内容</p>",
    on: vi.fn(),
    off: vi.fn(),
    commands: { setContent: vi.fn() },
  },
}));

vi.mock("@tiptap/react", () => ({
  useEditor: (config: typeof tiptapMocks.config) => {
    tiptapMocks.config = config;
    return tiptapMocks.editor;
  },
  EditorContent: () => React.createElement("div", { "data-testid": "editor" }),
}));

vi.mock("./config/toolbarItems", () => ({ toolbarItems: [] }));

import Tiptap from "./index";

const TiptapForTest = Tiptap as React.ComponentType<{
  value?: string;
  onChange?: (value: string) => void;
}>;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Tiptap", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    tiptapMocks.config = undefined;
    tiptapMocks.editor.on.mockReset();
    tiptapMocks.editor.off.mockReset();
    tiptapMocks.editor.commands.setContent.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("forwards editor updates as HTML", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(React.createElement(TiptapForTest, { onChange }));
    });

    tiptapMocks.config?.onUpdate?.({ editor: tiptapMocks.editor });

    expect(onChange).toHaveBeenCalledWith("<p>当前内容</p>");
    expect(container.querySelector('[data-testid="editor"]')).not.toBeNull();
  });

  it("syncs changed external content into the editor", async () => {
    await act(async () => {
      root.render(
        React.createElement(TiptapForTest, {
          value: "<p>外部内容</p>",
        }),
      );
    });

    expect(tiptapMocks.editor.commands.setContent).toHaveBeenCalledWith(
      "<p>外部内容</p>",
    );
  });
});
