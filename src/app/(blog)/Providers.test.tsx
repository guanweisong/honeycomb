import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientLogger } from "@/lib/observability/client";
import { Providers } from "./Providers";
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: { Provider: ({ children }: { children: React.ReactNode }) => children },
  trpcClient: {},
}));
vi.mock("@/lib/observability/client", () => ({
  clientLogger: { warn: vi.fn() },
}));
describe("optional service worker", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    container = document.createElement("div");
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  });
  it.each(["supported", "unsupported", "rejected"])(
    "keeps content available when registration is %s",
    async (mode) => {
      const register = vi.fn(() =>
        mode === "rejected"
          ? Promise.reject(new Error("Optional SW unavailable"))
          : Promise.resolve(),
      );
      vi.stubGlobal(
        "navigator",
        mode === "unsupported" ? {} : { serviceWorker: { register } },
      );
      await act(async () =>
        root.render(
          <Providers>
            <p>Online content</p>
          </Providers>,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(container.textContent).toBe("Online content");
      if (mode === "unsupported") expect(register).not.toHaveBeenCalled();
      else expect(register).toHaveBeenCalledOnce();
      if (mode === "rejected")
        expect(clientLogger.warn).toHaveBeenCalledWith(
          "service-worker.registration.failed",
        );
    },
  );
});
