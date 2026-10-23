import React, { act } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const renders = vi.hoisted(() => ({ content: vi.fn() }));

// Keep the real hooks and EditorContent; count its parent renders only.
vi.mock("@tiptap/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tiptap/react")>();
  return {
    ...original,
    EditorContent: (
      props: React.ComponentProps<typeof original.EditorContent>,
    ) => {
      renders.content();
      return <original.EditorContent {...props} />;
    },
  };
});

import Tiptap from "./index";

describe("Tiptap", () => {
  beforeEach(() => {
    renders.content.mockClear();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function renderEditor(props: React.ComponentProps<typeof Tiptap> = {}) {
    const view = render(<Tiptap {...props} />);
    const element = await view.findByRole("textbox");
    if (!("editor" in element) || !(element.editor instanceof Editor)) {
      throw new Error("Real editor missing");
    }
    return { ...view, editor: element.editor };
  }

  it("forwards real HTML edits to the latest callback", async () => {
    const initialOnChange = vi.fn();
    const onChange = vi.fn();
    const view = await renderEditor({
      value: "<p>Initial</p>",
      onChange: initialOnChange,
    });
    view.rerender(<Tiptap value="<p>Initial</p>" onChange={onChange} />);
    await act(async () => view.editor.commands.setContent("<p>Edited</p>"));
    expect(onChange).toHaveBeenCalledWith("<p>Edited</p>");
    expect(initialOnChange).not.toHaveBeenCalled();
    expect(view.getByRole("textbox").textContent).toBe("Edited");
  });

  it("syncs external HTML without echoing an edit", async () => {
    const onChange = vi.fn();
    const view = await renderEditor({ value: "<p>Initial</p>", onChange });
    view.rerender(<Tiptap value="<h2>External</h2>" onChange={onChange} />);
    expect(view.editor.getHTML()).toBe("<h2>External</h2><p></p>");
    expect(view.getByRole("button", { name: "二级标题" })).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("updates marks, group labels, alignment and link controls on real selection changes without rerendering EditorContent", async () => {
    const view = await renderEditor({
      value:
        '<h2 style="text-align: center"><strong><span style="color: red"><a href="https://example.test">Marked</a></span></strong></h2><p>Plain</p>',
    });
    renders.content.mockClear();
    await act(async () => view.editor.commands.setTextSelection(2));
    expect(
      view.getByRole("button", { name: "加粗" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      view.getByRole("button", { name: "超链接" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      view
        .getByRole("button", { name: "居中对齐" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(view.getByRole("button", { name: "二级标题" })).toBeTruthy();
    expect(view.getByRole("button", { name: "红" })).toBeTruthy();

    await act(async () => view.editor.commands.setTextSelection(10));
    expect(
      view.getByRole("button", { name: "加粗" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      view.getByRole("button", { name: "超链接" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      view
        .getByRole("button", { name: "居中对齐" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(view.getByRole("button", { name: "标题" })).toBeTruthy();
    expect(view.getByRole("button", { name: "颜色" })).toBeTruthy();
    expect(renders.content).not.toHaveBeenCalled();
  });

  it("reflects mark transactions, undo and redo in the real toolbar", async () => {
    const view = await renderEditor({ value: "<p>Text</p>" });
    const bold = () =>
      view.getByRole("button", { name: "加粗" }).getAttribute("aria-pressed");
    renders.content.mockClear();
    await act(async () => view.editor.chain().selectAll().toggleBold().run());
    expect(bold()).toBe("true");
    expect(view.editor.getHTML()).toBe("<p><strong>Text</strong></p>");
    await act(async () => view.editor.commands.undo());
    expect(bold()).toBe("false");
    expect(view.editor.getHTML()).toBe("<p>Text</p>");
    await act(async () => view.editor.commands.redo());
    expect(bold()).toBe("true");
    expect(view.editor.getHTML()).toBe("<p><strong>Text</strong></p>");
    expect(renders.content).not.toHaveBeenCalled();
  });

  it("reflects programmatic content transactions even with emitUpdate disabled", async () => {
    const onChange = vi.fn();
    const view = await renderEditor({ value: "<p>Text</p>", onChange });
    renders.content.mockClear();
    await act(async () =>
      view.editor.commands.setContent("<h1>Heading</h1>", {
        emitUpdate: false,
      }),
    );
    expect(view.getByRole("button", { name: "一级标题" })).toBeTruthy();
    expect(view.getByRole("textbox").textContent).toBe("Heading");
    expect(onChange).not.toHaveBeenCalled();
    expect(renders.content).not.toHaveBeenCalled();
  });

  it("closes portalled controls on disable and restores editing with current toolbar state", async () => {
    const value = '<p><a href="https://example.test">Link</a></p>';
    const view = await renderEditor({ value });
    await act(async () => view.editor.commands.setTextSelection(2));
    await act(async () => view.getByRole("button", { name: "超链接" }).click());
    expect(view.getByRole("textbox", { name: "链接地址" })).toBeTruthy();
    view.rerender(<Tiptap value={value} disabled />);
    expect(view.queryByRole("textbox", { name: "链接地址" })).toBeNull();
    expect(view.editor.isEditable).toBe(false);
    expect(view.container.querySelector("fieldset")?.disabled).toBe(true);
    expect(
      view.container.querySelector("fieldset")?.hasAttribute("inert"),
    ).toBe(true);
    view.rerender(<Tiptap value={value} />);
    expect(view.editor.isEditable).toBe(true);
    expect(view.container.querySelector("fieldset")?.disabled).toBe(false);
    expect(
      view.getByRole("button", { name: "超链接" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("destroys the real editor and removes its toolbar when unmounted", async () => {
    const view = await renderEditor({ value: "<p>Text</p>" });
    view.unmount();
    await waitFor(() => expect(view.editor.isDestroyed).toBe(true));
    expect(view.container.querySelector("button")).toBeNull();
    expect(view.container.querySelector('[role="textbox"]')).toBeNull();
  });
});
