import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateContextOptions } from "@/lib/trpc/context";

const state = vi.hoisted(() => ({
  contexts: new Map<string, CreateContextOptions>(),
  gates: new Map<string, Promise<void>>(),
}));

vi.mock("@/app/_trpc/router", () => ({ appRouter: {} }));
vi.mock("@/lib/trpc/context", () => ({
  createContext: async (options: CreateContextOptions) => {
    const requestId = options.requestContext?.requestId;
    if (!requestId)
      throw new Error("The route must pass an explicit request ID");
    state.contexts.set(requestId, options);
    return { requestId };
  },
}));
vi.mock("@trpc/server/adapters/fetch", () => ({
  fetchRequestHandler: async ({
    req,
    createContext,
  }: {
    req: Request;
    createContext: () => Promise<{ requestId: string }>;
  }) => {
    await state.gates.get(req.headers.get("x-request-id") ?? "");
    await createContext();
    return new Response(null, { status: 204 });
  },
}));

import { GET } from "@/app/api/trpc/[trpc]/route";

function request(requestId?: string) {
  return new Request("https://honeycomb.test/api/trpc/post.list", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
  });
}

describe("tRPC route handler", () => {
  beforeEach(() => {
    state.contexts.clear();
    state.gates.clear();
  });

  it("passes the incoming request and ID explicitly and echoes that ID", async () => {
    const req = request("req-route-client");
    const response = await GET(req);

    expect(state.contexts.get("req-route-client")).toEqual({
      req,
      requestContext: { requestId: "req-route-client" },
    });
    expect(response.headers.get("x-request-id")).toBe("req-route-client");
  });

  it("passes and echoes the same generated ID", async () => {
    const req = request();
    const response = await GET(req);
    const requestId = response.headers.get("x-request-id");

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(state.contexts.get(requestId ?? "")).toEqual({
      req,
      requestContext: { requestId },
    });
  });

  it("keeps interleaved requests isolated when contexts are created out of order", async () => {
    const firstGate = Promise.withResolvers<void>();
    const secondGate = Promise.withResolvers<void>();
    state.gates.set("req-first", firstGate.promise);
    state.gates.set("req-second", secondGate.promise);
    const firstRequest = request("req-first");
    const secondRequest = request("req-second");
    const first = GET(firstRequest);
    const second = GET(secondRequest);

    try {
      secondGate.resolve();
      expect((await second).headers.get("x-request-id")).toBe("req-second");
      expect(state.contexts.has("req-first")).toBe(false);
      firstGate.resolve();
      expect((await first).headers.get("x-request-id")).toBe("req-first");
      expect(state.contexts.get("req-first")?.req).toBe(firstRequest);
      expect(state.contexts.get("req-second")?.req).toBe(secondRequest);
    } finally {
      firstGate.resolve();
      secondGate.resolve();
      await Promise.allSettled([first, second]);
    }
  });
});
