import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryObservability } from "./packages/observability/adapters/memory";
import { configureObservability } from "./packages/observability/server/registry";
import { onRequestError, register } from "./instrumentation";

const productionCoreEnv = {
  NEXT_PUBLIC_SITE_URL: "https://honeycomb.example.com",
  TURSO_URL: "libsql://honeycomb.turso.io",
  TURSO_TOKEN: "turso-token",
  AUTH_SECRET: "auth-secret",
  AUTH_URL: "https://honeycomb.example.com",
};

describe("instrumentation register", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    configureObservability();
  });

  it("rejects an invalid production environment before the server handles requests", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://honeycomb.example.com");
    vi.stubEnv("TURSO_URL", "invalid-turso-url");
    vi.stubEnv("TURSO_TOKEN", "turso-token");
    vi.stubEnv("AUTH_SECRET", "auth-secret");
    vi.stubEnv("AUTH_URL", "https://honeycomb.example.com");

    expect(() => register()).toThrow(/TURSO_URL/);
  });

  it("skips production validation during the build phase", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("TURSO_URL", "invalid-turso-url");

    expect(() => register()).not.toThrow();
  });

  it("allows a valid production environment in either Node or Worker runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "edge");
    for (const [key, value] of Object.entries(productionCoreEnv)) {
      vi.stubEnv(key, value);
    }

    expect(() => register()).not.toThrow();
  });

  it("does not block development startup on production-only validation", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURSO_URL", "invalid-turso-url");

    expect(() => register()).not.toThrow();
  });

  it("records only safe request error fields from Next.js", async () => {
    const memory = createMemoryObservability();
    configureObservability({ logger: memory.logger });
    const error = new Error("token=secret-value");

    await onRequestError(
      error,
      {
        path: "/api/posts?author=123",
        method: "POST",
        headers: { "x-request-id": "req-next-error" },
      },
      {
        routerKind: "App Router",
        routePath: "/api/posts",
        routeType: "route",
        revalidateReason: undefined,
      },
    );

    expect(memory.logEvents).toEqual([
      {
        level: "error",
        event: "server.error",
        context: {
          route: "/api/posts",
          method: "POST",
          requestId: "req-next-error",
          error: expect.objectContaining({
            name: "Error",
            message: "[REDACTED]",
          }),
        },
      },
    ]);
    expect(JSON.stringify(memory.logEvents)).not.toContain("author=123");
    expect(JSON.stringify(memory.logEvents)).not.toContain("secret-value");
  });

  it("generates an error request ID when Next.js has none", async () => {
    const memory = createMemoryObservability();
    configureObservability({ logger: memory.logger });

    await onRequestError(
      new Error("failure"),
      { path: "/api/posts", method: "GET", headers: {} },
      {
        routerKind: "App Router",
        routePath: "/api/posts",
        routeType: "route",
        revalidateReason: undefined,
      },
    );

    expect(memory.logEvents[0]?.context.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("reads an incoming request ID without assuming header casing", async () => {
    const memory = createMemoryObservability();
    configureObservability({ logger: memory.logger });

    await onRequestError(
      new Error("failure"),
      {
        path: "/api/posts",
        method: "GET",
        headers: { "X-ReQuEsT-Id": "req-mixed-case" },
      },
      {
        routerKind: "App Router",
        routePath: "/api/posts",
        routeType: "route",
        revalidateReason: undefined,
      },
    );

    expect(memory.logEvents[0]?.context.requestId).toBe("req-mixed-case");
  });
});
