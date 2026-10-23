import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ErrorBoundaryHandler,
  type ErrorInfo,
} from "next/dist/client/components/error-boundary";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import BlogError from "@/app/(blog)/error";
import AdminError from "@/app/admin/error";
import GlobalError from "@/app/global-error";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe.each([
  ["blog", BlogError],
  ["admin", AdminError],
  ["global", GlobalError],
] as const)("%s framework error recovery", (name, ErrorComponent) => {
  it("refreshes through Next's real retry handler before recovering the failed child", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let refreshed = false;
    const refresh = vi.fn(() => {
      refreshed = true;
    });
    function FailedContent() {
      if (!refreshed) throw new Error("Transient server content failure");
      return <p>Recovered content</p>;
    }
    function Fallback({ error, ...actions }: ErrorInfo) {
      if (!(error instanceof Error)) throw error;
      return <ErrorComponent error={error} {...actions} />;
    }
    // global-error owns the document; other boundaries are ordinary segments.
    const container =
      name === "global"
        ? document.implementation.createHTMLDocument("Recovery")
        : document.createElement("div");
    if (container instanceof HTMLDivElement)
      document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <AppRouterContext.Provider
            value={{
              back: vi.fn(),
              forward: vi.fn(),
              push: vi.fn(),
              replace: vi.fn(),
              prefetch: vi.fn(),
              bfcacheId: "test",
              refresh,
            }}
          >
            <ErrorBoundaryHandler pathname="/test" errorComponent={Fallback}>
              <FailedContent />
            </ErrorBoundaryHandler>
          </AppRouterContext.Provider>,
        ),
      );
      expect(refresh).not.toHaveBeenCalled();
      await act(async () => container.querySelector("button")?.click());
      expect(refresh).toHaveBeenCalledOnce();
      expect(
        container instanceof Document
          ? container.body.textContent
          : container.textContent,
      ).toContain("Recovered content");
    } finally {
      await act(async () => root.unmount());
      if (container instanceof HTMLDivElement) container.remove();
    }
  });
});
