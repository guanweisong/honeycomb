import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import MultiLangText from "./";

vi.mock("next/image", () => ({
  default: ({ alt, title }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <span role="img" aria-label={alt} title={title} />
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

  it("falls back to available translations across prop changes", () => {
    render({ en: "English only" });
    expect(container.textContent).toBe("English only");
    act(() => root.render(<MultiLangText text={{ zh: "中文" }} />));
    expect(container.textContent).toBe("中文");
    act(() =>
      root.render(<MultiLangText text={{ en: "English again", zh: "" }} />),
    );
    expect(container.textContent).toBe("English again");
  });

  it("starts in Chinese and toggles to English when the language icon is clicked", () => {
    render({ en: "Hello", zh: "你好" });

    expect(container.textContent).toContain("你好");

    const languageIcon = container.querySelector<HTMLButtonElement>(
      'button[aria-label="切换到英文"]',
    );
    expect(languageIcon).not.toBeNull();

    act(() =>
      languageIcon?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );

    expect(container.textContent).toContain("Hello");
    const back = container.querySelector<HTMLButtonElement>(
      'button[aria-label="切换到中文"]',
    );
    back?.focus();
    expect(document.activeElement).toBe(back);
    act(() => back?.click());
    expect(container.textContent).toContain("你好");
  });
});
