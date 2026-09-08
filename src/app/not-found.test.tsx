import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("global not-found", () => {
  let root: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("provides a clear status and keyboard-accessible recovery link", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<NotFound />));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "404",
    );
    expect(container.querySelector('a[href="/en/list/category"]')?.textContent)
      .toBe("返回首页");
  });
});
