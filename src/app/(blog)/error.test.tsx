import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "./error";
import AdminError from "../admin/error";
import GlobalError from "../global-error";
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

  it("离线水合失败时保留英文离线提示与重试操作", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    document.documentElement.lang = "en";

    await act(async () => {
      root.render(
        <ErrorBoundary error={new Error("offline")} reset={vi.fn()} />,
      );
    });

    expect(container.textContent).toContain("You're offline");
    expect(container.textContent).toContain(
      "Please check your internet connection and try again",
    );
    expect(container.querySelector("button")?.textContent).toBe("Retry");
  });
});

describe("error boundary reporting", () => {
  it.each([ErrorBoundary, AdminError, GlobalError])(
    "captures a boundary error once per error change",
    async (Boundary) => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const error = new Error("synthetic boundary error");
      const reset = vi.fn();
      await act(async () =>
        root.render(<Boundary error={error} reset={reset} />),
      );
      expect(sentry.captureException).toHaveBeenCalledWith(error);
      sentry.captureException.mockClear();
      await act(async () =>
        root.render(<Boundary error={error} reset={reset} />),
      );
      expect(sentry.captureException).not.toHaveBeenCalled();
      await act(async () => root.unmount());
    },
  );
});
