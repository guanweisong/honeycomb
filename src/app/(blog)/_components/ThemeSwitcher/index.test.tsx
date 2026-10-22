import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let resolvedTheme = "light";
const themeChanges: string[] = [];

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    ViewTransition: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme,
    setTheme: (theme: string) => themeChanges.push(theme),
  }),
}));

import { ThemeSwitcher } from "./index";

describe("ThemeSwitcher", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.remove());
    resolvedTheme = "light";
    themeChanges.length = 0;
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("mounts the light theme control and creates the PWA theme meta", async () => {
    await act(async () => root.render(React.createElement(ThemeSwitcher)));

    expect(
      container.querySelector('[aria-label="Toggle theme"]'),
    ).not.toBeNull();
    expect(
      document.head
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute("content"),
    ).toBe("white");
  });

  it("renders the animated sun and moon icon control", async () => {
    await act(async () => root.render(React.createElement(ThemeSwitcher)));

    expect(
      container.querySelector('[data-testid="theme-switcher"] svg'),
    ).not.toBeNull();
    expect(container.querySelector("button button")).toBeNull();
    expect(
      container.querySelector('[role="switch"]')?.getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("delegates icon animation without custom Web Animations", async () => {
    const animate = vi.fn();
    const originalAnimate = Object.getOwnPropertyDescriptor(
      SVGElement.prototype,
      "animate",
    );
    Object.defineProperty(SVGElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });

    try {
      await act(async () => root.render(React.createElement(ThemeSwitcher)));
      await act(async () => {
        container
          .querySelector('[aria-label="Toggle theme"]')
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(animate).not.toHaveBeenCalled();
      expect(themeChanges).toEqual(["dark"]);
    } finally {
      if (originalAnimate) {
        Object.defineProperty(SVGElement.prototype, "animate", originalAnimate);
      } else {
        Reflect.deleteProperty(SVGElement.prototype, "animate");
      }
    }
  });

  it("updates every existing theme meta for dark mode", async () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<meta name="theme-color" content="old"><meta name="theme-color" content="old">',
    );
    resolvedTheme = "dark";

    await act(async () => root.render(React.createElement(ThemeSwitcher)));

    expect(
      Array.from(document.querySelectorAll('meta[name="theme-color"]')).map(
        (meta) => meta.getAttribute("content"),
      ),
    ).toEqual(["#111827", "#111827"]);
    expect(
      container
        .querySelector('[aria-label="Toggle theme"]')
        ?.getAttribute("data-checked"),
    ).toBe("true");
  });

  it("switches theme directly when view transitions are unavailable", async () => {
    await act(async () => root.render(React.createElement(ThemeSwitcher)));

    await act(async () => {
      container
        .querySelector('[aria-label="Toggle theme"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(themeChanges).toEqual(["dark"]);
  });

  it("does not cover the icon spring with a page view transition", async () => {
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return { ready: Promise.resolve() };
    });
    const animate = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    Object.defineProperty(document.documentElement, "animate", {
      configurable: true,
      value: animate,
    });
    await act(async () => root.render(React.createElement(ThemeSwitcher)));

    await act(async () => {
      container
        .querySelector('[aria-label="Toggle theme"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(themeChanges).toEqual(["dark"]);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
  });
});
