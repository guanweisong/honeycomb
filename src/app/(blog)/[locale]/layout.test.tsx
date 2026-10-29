import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

vi.mock("@/app/(blog)/components/Header", () => ({ default: () => null }));
vi.mock("@/app/(blog)/components/Footer", () => ({ default: () => null }));
vi.mock("@/app/(blog)/components/BackToTop", () => ({ default: () => null }));
vi.mock("@/app/lib/server/public-queries", () => ({
  getPublicSetting: vi.fn(),
}));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
}));

import LocaleLayout from "@/app/(blog)/[locale]/layout";

function countToasters(node: ReactNode): number {
  if (Array.isArray(node)) {
    return node.reduce((count, child) => count + countToasters(child), 0);
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) return 0;
  return (node.type === Toaster ? 1 : 0) + countToasters(node.props.children);
}

function findTheme(
  node: ReactNode,
): React.ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) return node.map(findTheme).find(Boolean);
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === ThemeProvider) return node;
  return findTheme(node.props.children);
}

describe("public feedback host", () => {
  it("mounts one toast host for public mutation and captcha feedback", async () => {
    const layout = await LocaleLayout({
      children: <main>Public content</main>,
      params: Promise.resolve({ locale: "en" }),
    });
    expect(countToasters(layout)).toBe(1);
    expect(findTheme(layout)?.props).toMatchObject({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
      disableTransitionOnChange: true,
    });
  });
});
