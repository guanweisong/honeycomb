import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";

vi.mock("@/app/(blog)/_components/Header", () => ({ default: () => null }));
vi.mock("@/app/(blog)/_components/Footer", () => ({ default: () => null }));
vi.mock("@/app/(blog)/_components/BackToTop", () => ({ default: () => null }));
vi.mock("@/app/(blog)/_components/ThemeProvider", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
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

describe("public feedback host", () => {
  it("mounts one toast host for public mutation and captcha feedback", async () => {
    const layout = await LocaleLayout({
      children: <main>Public content</main>,
      params: Promise.resolve({ locale: "en" }),
    });
    expect(countToasters(layout)).toBe(1);
  });
});
