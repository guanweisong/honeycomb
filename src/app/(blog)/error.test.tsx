import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "@/app/(blog)/error";
const sentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

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
    sentry.captureException.mockClear();
  });

  it.each(["zh", "en"])(
    "localizes ordinary errors in %s without an intl provider",
    async (language) => {
      document.documentElement.lang = language;
      vi.stubGlobal("navigator", { onLine: true });
      const retry = vi.fn();
      await act(async () =>
        root.render(
          <ErrorBoundary error={new Error("Failed")} retry={retry} />,
        ),
      );
      expect(container.textContent).toContain(
        language === "zh" ? "页面遇到了一点问题" : "Something went wrong!",
      );
      expect(container.querySelector("button")?.textContent).toBe(
        language === "zh" ? "重试" : "Try again",
      );
      await act(async () => container.querySelector("button")?.click());
      expect(retry).toHaveBeenCalledOnce();
    },
  );

  it("离线水合失败时保留英文离线提示与重试操作", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    document.documentElement.lang = "en";

    await act(async () => {
      root.render(
        <ErrorBoundary error={new Error("offline")} retry={vi.fn()} />,
      );
    });

    expect(container.textContent).toContain("You're offline");
    expect(container.textContent).toContain(
      "Please check your internet connection and try again",
    );
    expect(container.querySelector("button")?.textContent).toBe("Retry");
  });
});
