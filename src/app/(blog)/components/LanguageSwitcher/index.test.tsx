import React, { type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en",
  pathname: "/archives/1",
  resolvedTheme: "light",
  linkProps: undefined as
    | {
        href?: string;
        locale?: string;
        replace?: boolean;
        "aria-label"?: string;
      }
    | undefined,
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

vi.mock("@/packages/ui/navigation/blog-navigation", () => ({
  usePathname: () => mocks.pathname,
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    locale?: string;
    replace?: boolean;
  }) => {
    mocks.linkProps = props;
    return <a {...props}>{children}</a>;
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    ViewTransition: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

import LanguageSwitcher from ".";

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
  });

  it("waits for client mounting before rendering the switcher", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(<LanguageSwitcher />));

    expect(container.querySelector("a")).not.toBeNull();
    expect(mocks.linkProps).toMatchObject({
      href: "/archives/1",
      locale: "zh",
      replace: true,
      "aria-label": "Switch to 中文",
    });
  });

  it("renders the current language label and switches from Chinese to English", () => {
    mocks.locale = "zh";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(<LanguageSwitcher />));

    expect(container.querySelector("img")?.alt).toBe("Current language: 中文");
    expect(mocks.linkProps).toMatchObject({
      locale: "en",
      "aria-label": "Switch to English",
    });
  });

  it("keeps the switcher usable in dark theme", () => {
    mocks.resolvedTheme = "dark";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(<LanguageSwitcher />));

    const image = container.querySelector("img");
    expect(image?.alt).toBe("Current language: English");
    expect(image?.className).toContain("w-5");
    expect(image?.className).toContain("cursor-pointer");
  });
});
