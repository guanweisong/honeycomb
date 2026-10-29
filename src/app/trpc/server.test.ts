import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCaller: vi.fn(),
  createContext: vi.fn(async () => ({})),
}));

vi.mock("@/app/trpc/router", () => ({
  appRouter: { createCaller: mocks.createCaller },
}));
vi.mock("@/lib/trpc/context", () => ({
  createContext: mocks.createContext,
}));

import { createServerClient } from "@/app/trpc/server";

describe("createServerClient", () => {
  it("creates a public context without a fabricated HTTP request", async () => {
    mocks.createCaller.mockReturnValueOnce({});
    await createServerClient();
    expect(mocks.createContext).toHaveBeenCalledExactlyOnceWith({});
  });

  it("preserves explicit cache request context and observability options", async () => {
    mocks.createContext.mockClear();
    const requestContext = { requestId: "cache-fill" };
    await createServerClient({
      requestContext,
      skipRequestObservability: true,
    });
    expect(mocks.createContext).toHaveBeenCalledExactlyOnceWith({
      requestContext,
      skipRequestObservability: true,
    });
  });
});
