import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  contextRequestId: undefined as string | undefined,
  scopeRequestId: undefined as string | undefined,
}));

vi.mock("@/packages/trpc/api/app-router", () => ({ appRouter: {} }));

vi.mock("@/packages/trpc/api", async () => {
  const { getRequestContext } = await import(
    "@/packages/infrastructure/observability/server/node-request-context"
  );

  return {
    createTrpcContext: async () => ({ requestId: getRequestContext()?.requestId }),
  };
});

vi.mock("@trpc/server/adapters/fetch", async () => {
  const { getRequestContext } = await import(
    "@/packages/infrastructure/observability/server/node-request-context"
  );

  return {
    fetchRequestHandler: async ({ createContext }: { createContext: () => Promise<{ requestId?: string }> }) => {
      state.scopeRequestId = getRequestContext()?.requestId;
      state.contextRequestId = (await createContext()).requestId;
      return new Response(null, { status: 204 });
    },
  };
});

import { GET } from "./route";

describe("tRPC route handler", () => {
  beforeEach(() => {
    state.contextRequestId = undefined;
    state.scopeRequestId = undefined;
  });

  it("uses one incoming request ID for the route scope and tRPC context", async () => {
    const response = await GET(
      new Request("https://honeycomb.test/api/trpc/post.list", {
        headers: { "x-request-id": "req-route-client" },
      }),
    );

    expect(state.scopeRequestId).toBe("req-route-client");
    expect(state.contextRequestId).toBe("req-route-client");
    expect(response.headers.get("x-request-id")).toBe("req-route-client");
  });
});
