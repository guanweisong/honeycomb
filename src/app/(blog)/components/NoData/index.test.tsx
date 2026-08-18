import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import NoData from ".";

describe("NoData", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("renders the empty-state title with centered spacing", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<NoData title="没有内容" />));

    expect(container.textContent).toBe("没有内容");
    expect(container.firstElementChild?.className).toContain("text-center");
  });
});
