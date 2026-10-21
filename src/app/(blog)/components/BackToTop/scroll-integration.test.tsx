import React, { act, Profiler } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BackToTop from ".";

describe("BackToTop real scroll subscription", () => {
  let container: HTMLDivElement;
  let root: Root;
  const commits = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("scrollY", 0);
    commits.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const render = () =>
    act(() =>
      root.render(
        <Profiler id="back-to-top" onRender={commits}>
          <BackToTop />
        </Profiler>,
      ),
    );
  const scroll = (top: number) =>
    act(() => {
      vi.stubGlobal("scrollY", top);
      window.dispatchEvent(new Event("scroll"));
    });

  it("does not commit new state while scroll stays below the threshold", () => {
    render();
    const before = commits.mock.calls.length;
    for (const top of [1, 100, 200, 300]) scroll(top);
    expect(commits).toHaveBeenCalledTimes(before);
    scroll(301);
    expect(container.querySelector("button")).not.toBeNull();
    scroll(300);
    expect(container.querySelector("button")).toBeNull();
  });

  it("restores initial browser scroll while SSR stays hidden and cleans its listener", () => {
    vi.stubGlobal("scrollY", 500);
    expect(renderToString(<BackToTop />)).not.toContain("button");
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    render();
    expect(container.querySelector("button")).not.toBeNull();
    const listener = add.mock.calls.find(([event]) => event === "scroll");
    expect(listener).toEqual([
      "scroll",
      expect.any(Function),
      { passive: true },
    ]);
    act(() => root.unmount());
    expect(remove).toHaveBeenCalledWith("scroll", listener?.[1]);
    root = createRoot(container);
  });
});
