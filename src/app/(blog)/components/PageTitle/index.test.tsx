import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import PageTitle from ".";

describe("PageTitle", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("renders children as a styled h2 heading", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<PageTitle>文章归档</PageTitle>));

    expect(container.querySelector("h2")?.textContent).toBe("文章归档");
    expect(container.querySelector("h2")?.className).toContain("text-center");
  });
});
