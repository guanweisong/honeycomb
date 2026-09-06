import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "./error";

describe("Blog error boundary", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("离线水合失败时保留英文离线提示与重试操作", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    document.documentElement.lang = "en";

    await act(async () => {
      root.render(<ErrorBoundary error={new Error("offline")} reset={vi.fn()} />);
    });

    expect(container.textContent).toContain("You're offline");
    expect(container.textContent).toContain(
      "Please check your internet connection and try again",
    );
    expect(container.querySelector("button")?.textContent).toBe("Retry");
  });
});
