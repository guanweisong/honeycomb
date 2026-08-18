import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import MultiLangText from ".";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <span
      role="img"
      aria-label={props.alt}
      title={props.title}
      onClick={props.onClick}
    />
  ),
}));

describe("MultiLangText", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  function render(text: { en?: string; zh?: string }) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<MultiLangText text={text} />));
  }

  it("renders a placeholder when both translations are empty", () => {
    render({ en: "", zh: "" });

    expect(container.textContent).toBe("-");
  });

  it("starts in Chinese and toggles to English when the language icon is clicked", () => {
    render({ en: "Hello", zh: "你好" });

    expect(container.textContent).toContain("你好");

    const languageIcon = container.querySelector('[role="img"]');
    expect(languageIcon).not.toBeNull();

    act(() => languageIcon?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(container.textContent).toContain("Hello");
  });
});
