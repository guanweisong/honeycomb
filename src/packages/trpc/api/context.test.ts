import { describe, expect, it, vi } from "vitest";

import { runWithRequestContext } from "../../observability/server/node-request-context";

const database = {};

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/packages/db/db", () => ({
  getDb: () => database,
}));

import { createContext } from "./context";
import { createTrpcContext } from "./defaultContext";

describe("createContext", () => {
  it("keeps the request ID supplied by a tRPC request", async () => {
    const context = await createContext({
      req: new Request("https://honeycomb.test/api/trpc", {
        headers: { "x-request-id": "req-trpc-client" },
      }),
    });

    expect(context.requestId).toBe("req-trpc-client");
  });

  it("uses the active request scope when a request has no ID", async () => {
    await runWithRequestContext({ requestId: "req-trpc-scope" }, async () => {
      const context = await createContext({});

      expect(context.requestId).toBe("req-trpc-scope");
    });
  });

  it("preserves the request ID through the default tRPC context factory", async () => {
    const context = await createTrpcContext({
      req: new Request("https://honeycomb.test/api/trpc", {
        headers: { "x-request-id": "req-trpc-default-context" },
      }),
    });

    expect(context.requestId).toBe("req-trpc-default-context");
  });
});
