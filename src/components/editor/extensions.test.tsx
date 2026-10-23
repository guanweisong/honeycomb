import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Editor } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Tiptap from "./index";

// Toolbar menus are independent of the real editor extension configuration.
vi.mock("./config/toolbar-items", () => ({ toolbarItems: [] }));

describe("editor link extension contract", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  async function renderEditor(value: string) {
    await act(async () => root.render(<Tiptap value={value} />));
    const element = container.querySelector('[role="textbox"]');
    if (
      !element ||
      !("editor" in element) ||
      !(element.editor instanceof Editor)
    ) {
      throw new Error("Real editor missing");
    }
    return element.editor;
  }

  it("registers one link and preserves safe markup without opening links while editing", async () => {
    const editor = await renderEditor("<p>Honeycomb</p>");
    expect(
      editor.extensionManager.extensions.filter(({ name }) => name === "link"),
    ).toHaveLength(1);

    await act(async () => {
      editor.chain().selectAll().setLink({ href: "https://example.com" }).run();
    });
    expect(editor.getHTML()).toBe(
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">Honeycomb</a></p>',
    );

    const link = container.querySelector("a");
    if (!link) throw new Error("Rendered link missing");
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const click = new MouseEvent("click", { bubbles: true, button: 0 });
    Object.defineProperty(click, "target", { value: link });
    editor.view.someProp("handleClick", (handler) =>
      handler(editor.view, 1, click),
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("autolinks a typed URL when the next space completes it", async () => {
    const editor = await renderEditor("<p></p>");
    await act(async () => {
      editor.view.dispatch(editor.state.tr.insertText("https://example.com "));
    });
    expect(editor.getHTML()).toBe(
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">https://example.com</a> </p>',
    );
  });

  it("links the selected text when a URL is pasted", async () => {
    const editor = await renderEditor("<p>Honeycomb</p>");
    await act(async () => {
      editor.commands.selectAll();
      const slice = new Slice(
        Fragment.from(editor.schema.text("https://example.com")),
        0,
        0,
      );
      editor.view.someProp("handlePaste", (handler) =>
        handler(
          editor.view,
          Object.assign(new Event("paste"), { clipboardData: null }),
          slice,
        ),
      );
    });
    expect(editor.getHTML()).toBe(
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">Honeycomb</a></p>',
    );
  });
});
