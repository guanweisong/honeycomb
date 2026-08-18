import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

let scrollTop: number | undefined;

vi.mock("ahooks", () => ({
  useScroll: () => ({ top: scrollTop }),
}));

import BackToTop from ".";

describe("BackToTop", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    scrollTop = undefined;
    vi.unstubAllGlobals();
  });

  const render = () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<BackToTop />));
  };

  it("stays hidden before the scroll threshold", () => {
    scrollTop = 300;
    render();

    expect(container.querySelector("button")).toBeNull();
  });

  it("shows an accessible button after scrolling past the threshold", () => {
    scrollTop = 301;
    render();

    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-label")).toBe("Back to top");
    expect(button?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("scrolls the window to the top when clicked", () => {
    scrollTop = 500;
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    render();

    act(() => container.querySelector("button")?.click());

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
