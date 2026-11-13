import React, { type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en",
  pathname: "/archives/1",
  resolvedTheme: "light",
  linkProps: undefined as
    | {
        href?: string;
        hrefLang?: string;
        locale?: string;
        prefetch?: boolean | "auto" | null;
        replace?: boolean;
        "aria-label"?: string;
      }
    | undefined,
  linkKind: undefined as "intl" | undefined,
  prerendering: false,
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mocks.resolvedTheme }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}));

vi.mock("@/app/(blog)/lib/blog-navigation", () => ({
  usePathname: () => {
    if (mocks.prerendering) throw new Error("Route hooks are client-only");
    return mocks.pathname;
  },
  Link: ({
    children,
    href,
    locale,
    prefetch = true,
    hrefLang,
    replace,
    "aria-label": ariaLabel,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    locale?: string;
    prefetch?: boolean | "auto" | null;
    hrefLang?: string;
    replace?: boolean;
    "aria-label"?: string;
  }) => {
    mocks.linkProps = {
      ...props,
      href,
      locale,
      prefetch,
      hrefLang,
      replace,
      "aria-label": ariaLabel,
    };
    mocks.linkKind = "intl";
    return (
      <a href={locale ? `/${locale}${href}` : href} aria-label={ariaLabel}>
        {children}
      </a>
    );
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    ViewTransition: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

import LanguageSwitcher from "@/app/(blog)/components/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.locale = "en";
    mocks.pathname = "/archives/1";
    mocks.resolvedTheme = "light";
    mocks.linkProps = undefined;
    mocks.linkKind = undefined;
    mocks.prerendering = false;
  });

  it("does not read route state before the client mounts", () => {
    mocks.prerendering = true;
    expect(renderToStaticMarkup(<LanguageSwitcher />)).toBe("");
  });

  it("waits for client mounting before rendering the switcher", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(<LanguageSwitcher />));

    expect(container.querySelector("a")).not.toBeNull();
    expect(mocks.linkKind).toBe("intl");
    expect(container.querySelector("img")?.alt).toBe(
      "Current language: English",
    );
    expect(mocks.linkProps).toMatchObject({
      href: "/archives/1",
      locale: "zh",
      hrefLang: "zh",
      prefetch: true,
      replace: true,
      "aria-label": "Switch to 中文",
    });
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/zh/archives/1",
    );
  });

  it("renders the current language label and switches from Chinese to English", () => {
    mocks.locale = "zh";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(<LanguageSwitcher />));

    expect(container.querySelector("img")?.alt).toBe("Current language: 中文");
    expect(mocks.linkProps).toMatchObject({
      href: "/archives/1",
      locale: "en",
      hrefLang: "en",
      prefetch: true,
      "aria-label": "Switch to English",
    });
  });

  it("keeps the switcher usable in dark theme", () => {
    mocks.resolvedTheme = "dark";
    mocks.pathname = "/archives/post-1";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(<LanguageSwitcher />));

    expect(mocks.linkProps).toMatchObject({
      href: "/archives/post-1",
      locale: "zh",
      hrefLang: "zh",
      prefetch: true,
      "aria-label": "Switch to 中文",
    });
    const image = container.querySelector("img");
    expect(image?.alt).toBe("Current language: English");
    expect(image?.className).toContain("w-5");
    expect(image?.className).toContain("cursor-pointer");
  });
});
