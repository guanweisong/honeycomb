import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import Card from ".";

describe("Card", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  const render = (title: string, children: React.ReactElement) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Card title={title}>{children}</Card>));
  };

  it("renders the title and content inside the card structure", () => {
    render("相关文章", <p data-testid="content">内容</p>);

    expect(container.querySelector("h2")?.textContent).toBe("相关文章");
    expect(container.querySelector('[data-testid="content"]')?.textContent).toBe(
      "内容",
    );
    expect(container.firstElementChild?.className).toContain("my-5");
  });

  it("preserves complex child elements without changing their props", () => {
    render("评论", <button type="button" disabled>提交</button>);

    const button = container.querySelector("button");
    expect(button?.textContent).toBe("提交");
    expect(button?.disabled).toBe(true);
  });
});
