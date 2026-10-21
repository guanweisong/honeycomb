import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Editor, type EditorOptions } from "@tiptap/core";
import { expect, it, vi } from "vitest";
import { sanitizeRichText } from "@/lib/security/sanitize-html";

const state = vi.hoisted(() => ({
  options: undefined as Partial<EditorOptions> | undefined,
}));
vi.mock("@tiptap/react", () => ({
  useEditor: (options: Partial<EditorOptions>) => {
    state.options = options;
    return null;
  },
  EditorContent: () => null,
}));
vi.mock("@/components/PhotoSwipe", () => ({
  PhotoSwipeClient: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
import Tiptap from "@/components/editor";
import { RichText } from "@/features/media/public/RichText";

it("round trips supported editor HTML through save sanitization and public rendering", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  let editor: Editor | undefined;
  try {
    await act(async () =>
      root.render(
        <Tiptap value='<h2>Title</h2><p><strong>Bold</strong> <a href="https://example.com">Link</a></p><img src="/photo.jpg" alt="Photo" /><ul><li><p>Item</p></li></ul>' />,
      ),
    );
    if (!state.options)
      throw new Error("Expected production editor configuration");
    editor = new Editor({
      ...state.options,
      element: document.createElement("div"),
    });
    const output = sanitizeRichText(editor.getHTML());
    const rendered = renderToStaticMarkup(<RichText html={output} />);
    const result = document.createElement("div");
    result.innerHTML = rendered;
    expect(result.querySelector("h2")?.textContent).toBe("Title");
    expect(result.querySelector("strong")?.textContent).toBe("Bold");
    expect(result.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com",
    );
    expect(result.querySelector("img")?.getAttribute("src")).toBe("/photo.jpg");
    expect(result.querySelector("li")?.textContent).toBe("Item");
    expect(
      editor.extensionManager.extensions.some(
        (extension) => extension.name === "video",
      ),
    ).toBe(false);
    expect(
      sanitizeRichText(
        '<p>Before</p><video src="/movie.mp4"></video><p>After</p>',
      ),
    ).toBe("<p>Before</p><p>After</p>");
  } finally {
    editor?.destroy();
    await act(async () => root.unmount());
  }
});
