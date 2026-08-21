import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children, ...props }: Record<string, unknown>) => {
    mocks.props = props;
    return (
      <div data-testid="next-themes-provider">
        {children as React.ReactNode}
      </div>
    );
  },
}));

import ThemeProvider from ".";

describe("ThemeProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.props = undefined;
  });

  it("forwards theme configuration and renders children", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main data-testid="content">内容</main>
        </ThemeProvider>,
      ),
    );

    expect(mocks.props).toMatchObject({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
    });
    expect(
      container.querySelector('[data-testid="content"]')?.textContent,
    ).toBe("内容");
  });

  it("does not alter child structure when no theme options are provided", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <ThemeProvider>
          <span>子节点</span>
        </ThemeProvider>,
      ),
    );

    expect(mocks.props).toEqual({});
    expect(container.textContent).toBe("子节点");
  });
});
