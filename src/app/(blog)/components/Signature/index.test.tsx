import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import Signature from ".";

describe("Signature", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("renders the text between two decorative divider lines", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Signature text="没有更多文章" />));

    expect(container.textContent).toBe("没有更多文章");
    expect(container.querySelectorAll("span")).toHaveLength(3);
    expect(container.firstElementChild?.className).toContain("flex");
    expect(container.querySelectorAll("span")[1].className).toContain("px-4");
  });

  it("supports an empty signature without adding fallback text", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Signature text="" />));

    expect(container.textContent).toBe("");
    expect(container.querySelectorAll("span")).toHaveLength(3);
  });
});
