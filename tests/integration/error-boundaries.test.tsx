import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import ErrorBoundary from "@/app/(blog)/error";
import AdminError from "@/app/admin/error";
import GlobalError from "@/app/global-error";
const sentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

describe("error boundary reporting", () => {
  it.each([ErrorBoundary, AdminError, GlobalError])(
    "captures a boundary error once per error change",
    async (Boundary) => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const error = new Error("synthetic boundary error");
      const retry = vi.fn();
      await act(async () =>
        root.render(<Boundary error={error} retry={retry} />),
      );
      expect(sentry.captureException).toHaveBeenCalledWith(error);
      sentry.captureException.mockClear();
      await act(async () =>
        root.render(<Boundary error={error} retry={retry} />),
      );
      expect(sentry.captureException).not.toHaveBeenCalled();
      await act(async () => root.unmount());
    },
  );
});
