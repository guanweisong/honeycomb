import { describe, expect, it, vi } from "vitest";
import { createAuthRequestAuditHandler } from "./auth-request-audit";

describe("createAuthRequestAuditHandler", () => {
  it("isolates Better Auth from the original request being consumed during audit", async () => {
    const { betterAuth } = await import("better-auth");
    const { username } = await import("better-auth/plugins");
    const { toNextJsHandler } = await import("better-auth/next-js");
    const { NextRequest } = await import("next/server");
    const auth = betterAuth({
      baseURL: "http://localhost:3000",
      secret: "Task5ForwardingTestSecret1234567890",
      emailAndPassword: { enabled: true },
      plugins: [username()],
      advanced: { database: { validateSchema: false } },
      logger: { disabled: true },
    });
    const recordHistory = vi.fn().mockResolvedValue(undefined);
    const findUserIdByIdentifier = vi.fn().mockResolvedValue(null);
    const authHandler = toNextJsHandler(auth).POST;
    const handler = createAuthRequestAuditHandler({
      handle: async (forwarded) => {
        expect(forwarded.method).toBe("POST");
        expect(forwarded.url).toBe(
          "http://localhost:3000/api/auth/sign-in/username",
        );
        expect(forwarded.headers.get("cookie")).toBe("fixture=cookie");
        expect(forwarded.headers.get("content-type")).toBe("application/json");
        return authHandler(forwarded);
      },
      getSession: vi.fn().mockResolvedValue(null),
      findUserIdByIdentifier,
      recordHistory,
    });
    const request = new NextRequest(
      "http://localhost:3000/api/auth/sign-in/username",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "fixture=cookie",
        },
        body: JSON.stringify({
          username: "missing_fixture_user",
          password: "fixture-password",
        }),
      },
    );
    const pending = handler(request);
    // Simulate the framework consuming its original while asynchronous audit
    // work is in flight. Better Auth must retain its own unread snapshot.
    await request.json();
    const response = await pending;
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: "INVALID_USERNAME_OR_PASSWORD",
    });
    expect(findUserIdByIdentifier).toHaveBeenCalledWith("missing_fixture_user");
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({ event: "LOGIN_FAILURE", provider: "password" }),
    );
  });

  it("preserves abort propagation on the isolated handler request", async () => {
    const controller = new AbortController();
    const request = new Request("https://example.test/api/auth/sign-out", {
      method: "POST",
      signal: controller.signal,
    });
    const handler = createAuthRequestAuditHandler({
      handle: async (forwarded) => {
        expect(forwarded).not.toBe(request);
        expect(forwarded.signal.aborted).toBe(true);
        expect(forwarded.signal.reason).toBe("fixture-abort");
        return Response.json({ ok: true });
      },
      getSession: vi.fn().mockResolvedValue(null),
      findUserIdByIdentifier: vi.fn().mockResolvedValue(null),
      recordHistory: vi.fn().mockResolvedValue(undefined),
    });
    const pending = handler(request);
    controller.abort("fixture-abort");
    await expect(pending).resolves.toHaveProperty("status", 200);
  });

  it("records a failed username login without changing the auth response", async () => {
    const response = Response.json(
      { code: "INVALID_USERNAME_OR_PASSWORD" },
      { status: 401 },
    );
    const recordHistory = vi.fn().mockResolvedValue(undefined);
    const handler = createAuthRequestAuditHandler({
      handle: vi.fn().mockResolvedValue(response),
      getSession: vi.fn().mockResolvedValue(null),
      findUserIdByIdentifier: vi.fn().mockResolvedValue("user-1"),
      recordHistory,
    });

    const result = await handler(
      new Request("https://example.test/api/auth/sign-in/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "secret" }),
      }),
    );

    expect(result).toBe(response);
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "LOGIN_FAILURE",
        provider: "password",
        userId: "user-1",
      }),
    );
    expect(recordHistory.mock.calls[0]?.[0]).not.toHaveProperty("password");
  });

  it("preserves the original response when audit storage fails", async () => {
    const response = Response.json({ ok: true });
    const handler = createAuthRequestAuditHandler({
      handle: vi.fn().mockResolvedValue(response),
      getSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
      findUserIdByIdentifier: vi.fn(),
      recordHistory: vi.fn().mockRejectedValue(new Error("audit unavailable")),
      reportError: vi.fn(),
    });

    const result = await handler(
      new Request("https://example.test/api/auth/sign-out", { method: "POST" }),
    );

    expect(result).toBe(response);
  });
});
