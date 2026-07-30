import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let resolvedTheme = "light";
let locale = "zh";
let pathname = "/archives/post-1";
let scrollTop: number | undefined;
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

vi.mock("react-toggle-dark-mode", () => ({
  DarkModeSwitch: ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) =>
    React.createElement(
      "button",
      {
        "aria-label": "Toggle theme",
        "data-checked": String(checked),
        onClick: () => onChange(!checked),
      },
      "theme",
    ),
}));

vi.mock("next-intl", () => ({
  useLocale: () => locale,
  useTranslations: () => (key: string) => {
    const values: Record<string, string> = {
      actors: "演员",
      directors: "导演",
      styles: "风格",
    };
    return values[key] ?? key;
  },
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", props),
}));

vi.mock("@/app/(blog)/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    locale: targetLocale,
    replace,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
    replace?: boolean;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement(
      "a",
      {
        ...props,
        "data-locale": targetLocale,
        "data-replace": String(!!replace),
        href,
      },
      children,
    ),
  usePathname: () => pathname,
}));

vi.mock("ahooks", () => ({
  useScroll: () => ({ top: scrollTop }),
}));

import { ThemeSwitcher } from "./index";
import LanguageSwitcher from "../LanguageSwitcher";
import BackToTop from "../BackToTop";
import Tags from "../Tags";

describe("blog appearance controls", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) =>
      meta.remove(),
    );
    resolvedTheme = "light";
    locale = "zh";
    pathname = "/archives/post-1";
    scrollTop = undefined;
    themeChanges.length = 0;
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
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

    expect(container.querySelector('[aria-label="Toggle theme"]')).not.toBeNull();
    expect(
      document.head.querySelector('meta[name="theme-color"]')?.getAttribute(
        "content",
      ),
    ).toBe("white");
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

  it("animates a supported theme transition from the control position", async () => {
    const animations: unknown[] = [];
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (callback: () => void) => {
        callback();
        return { ready: Promise.resolve() };
      },
    });
    Object.defineProperty(document.documentElement, "animate", {
      configurable: true,
      value: (keyframes: unknown, options: unknown) => {
        animations.push([keyframes, options]);
        return {} as Animation;
      },
    });
    await act(async () => root.render(React.createElement(ThemeSwitcher)));
    const control = container.querySelector('[data-testid="theme-switcher"]');
    vi.spyOn(control as HTMLElement, "getBoundingClientRect").mockReturnValue({
      bottom: 60,
      height: 20,
      left: 30,
      right: 50,
      toJSON: () => ({}),
      top: 40,
      width: 20,
      x: 30,
      y: 40,
    });

    await act(async () => {
      container
        .querySelector('[aria-label="Toggle theme"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(themeChanges).toEqual(["dark"]);
    expect(animations).toHaveLength(1);
  });

  it.each([
    ["zh", "light", "en", "Current language: 中文", "Switch to English"],
    ["en", "dark", "zh", "Current language: English", "Switch to 中文"],
  ])(
    "links %s readers to the other locale",
    async (currentLocale, theme, targetLocale, alt, label) => {
      locale = currentLocale;
      resolvedTheme = theme;
      await act(async () => root.render(React.createElement(LanguageSwitcher)));

      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("/archives/post-1");
      expect(link?.getAttribute("data-locale")).toBe(targetLocale);
      expect(link?.getAttribute("aria-label")).toBe(label);
      expect(container.querySelector("img")?.getAttribute("alt")).toBe(alt);
    },
  );

  it("shows back-to-top only after scrolling and returns to the origin", async () => {
    const scrollCalls: unknown[][] = [];
    vi.stubGlobal("scrollTo", (...args: unknown[]) => scrollCalls.push(args));
    await act(async () => root.render(React.createElement(BackToTop)));
    expect(container.querySelector('[aria-label="Back to top"]')).toBeNull();

    scrollTop = 301;
    await act(async () => root.render(React.createElement(BackToTop)));
    await act(async () => {
      container
        .querySelector('[aria-label="Back to top"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(scrollCalls).toEqual([[0, 0]]);
  });

  it("renders localized tag groups, separators and destination links", async () => {
    await act(async () => {
      root.render(
        React.createElement(Tags, {
          galleryStyles: [{ id: "gallery", name: { zh: "人像" } }],
          movieActors: [],
          movieDirectors: [
            { id: "director-1", name: { zh: "导演甲" } },
            { id: "director-2", name: { zh: "导演乙" } },
          ],
          movieStyles: undefined,
        } as never),
      );
    });

    expect(container.textContent).toContain("导演：导演甲、导演乙");
    expect(container.textContent).toContain("风格：人像");
    expect(container.querySelector('a[href="/list/tags/director-2"]')).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});
