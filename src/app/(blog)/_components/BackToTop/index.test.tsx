import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

let scrollTop: number | undefined;

vi.mock("@/lib/hooks/use-scrolled-past", () => ({
  useScrolledPast: (threshold: number) => (scrollTop ?? 0) > threshold,
}));

import BackToTop from "@/app/(blog)/_components/BackToTop";

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

  it("anchors the focusable control inside the viewport without an unbounded translation", () => {
    scrollTop = 301;
    render();
    const button = container.querySelector("button");
    button?.focus();
    expect(document.activeElement).toBe(button);
    expect(button?.className).toContain("right-4");
    expect(button?.className).not.toContain("translate-x-96");
  });
  it("derives visibility immediately without waiting for a state-sync effect", () => {
    scrollTop = 301;
    expect(renderToStaticMarkup(<BackToTop />)).toContain(
      'aria-label="Back to top"',
    );
    scrollTop = 300;
    expect(renderToStaticMarkup(<BackToTop />)).not.toContain("button");
  });

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
  it("shows back-to-top only after scrolling and returns to the origin", async () => {
    const scrollCalls: unknown[][] = [];
    vi.stubGlobal("scrollTo", (...args: unknown[]) => scrollCalls.push(args));
    render();
    expect(container.querySelector('[aria-label="Back to top"]')).toBeNull();

    scrollTop = 301;
    await act(async () => root.render(React.createElement(BackToTop)));
    const button = container.querySelector('[aria-label="Back to top"]');
    expect(button).not.toBeNull();
    await act(async () => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(scrollCalls).toEqual([[0, 0]]);
  });
});
