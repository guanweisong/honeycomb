import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import LoadingState from "./index";

describe("LoadingState", () => {
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
  });

  it("renders the default loading state", async () => {
    await act(async () => root.render(<LoadingState />));

    expect(container.querySelector("main")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(container.textContent).toContain("正在加载");
  });

  it("renders a custom label", async () => {
    await act(async () => root.render(<LoadingState label="Loading" />));

    expect(container.textContent).toContain("Loading");
  });
});
