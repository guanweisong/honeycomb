import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAppAuthRequestHandler,
  createAuthRequestAuditHandler,
} from "@/app/auth/auth-request-audit";

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
    expect(findUserIdByIdentifier).toHaveBeenCalledWith(
      "missing_fixture_user",
      "username",
    );
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
  it("associates failed email login with the email, ignoring an unrelated username", async () => {
    const response = Response.json(
      { code: "INVALID_EMAIL_OR_PASSWORD" },
      { status: 401 },
    );
    const recordHistory = vi.fn();
    const findUserIdByIdentifier = vi.fn().mockResolvedValue("email-user");
    const handler = createAuthRequestAuditHandler({
      handle: vi.fn().mockResolvedValue(response),
      getSession: vi.fn(),
      findUserIdByIdentifier,
      recordHistory,
    });
    const result = await handler(
      new Request("https://example.test/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "reader@example.test",
          username: "other-user",
          password: "synthetic-password",
        }),
      }),
    );
    expect(result).toBe(response);
    expect(findUserIdByIdentifier).toHaveBeenCalledExactlyOnceWith(
      "reader@example.test",
      "email",
    );
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "LOGIN_FAILURE",
        provider: "password",
        userId: "email-user",
      }),
    );
    expect(JSON.stringify(recordHistory.mock.calls)).not.toContain(
      "synthetic-password",
    );
  });

  it.each([
    ["/sign-in/social", "INVALID_TOKEN"],
    ["/passkey/verify-authentication", "AUTHENTICATION_FAILED"],
  ])(
    "does not infer a user from password identifiers on %s",
    async (path, code) => {
      const findUserIdByIdentifier = vi.fn();
      const recordHistory = vi.fn();
      const handler = createAuthRequestAuditHandler({
        handle: vi
          .fn()
          .mockResolvedValue(Response.json({ code }, { status: 401 })),
        getSession: vi.fn(),
        findUserIdByIdentifier,
        recordHistory,
      });
      await handler(
        new Request(`https://example.test/api/auth${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username: "other-user",
            email: "other@example.test",
          }),
        }),
      );
      expect(findUserIdByIdentifier).not.toHaveBeenCalled();
      expect(recordHistory).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    },
  );

  it("does not fall back to an email supplied to the username route", async () => {
    const findUserIdByIdentifier = vi.fn();
    const recordHistory = vi.fn();
    const handler = createAuthRequestAuditHandler({
      handle: vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: "INVALID_USERNAME_OR_PASSWORD" },
            { status: 401 },
          ),
        ),
      getSession: vi.fn(),
      findUserIdByIdentifier,
      recordHistory,
    });
    await handler(
      new Request("https://example.test/api/auth/sign-in/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "other@example.test" }),
      }),
    );
    expect(findUserIdByIdentifier).not.toHaveBeenCalled();
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
    );
  });
});

describe("authentication failure audit boundaries", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["/callback/github", 302, undefined, "/admin", undefined],
    [
      "/callback/github",
      302,
      undefined,
      "/admin?error=application_value",
      "better-auth.session_token=fixture; Path=/; HttpOnly",
    ],
    ["/sign-in/email", 429, undefined, undefined, undefined],
    ["/sign-in/email", 400, "MISSING_RESPONSE", undefined, undefined],
    ["/sign-in/username", 403, "VERIFICATION_FAILED", undefined, undefined],
    ["/sign-in/social", 400, "VALIDATION_ERROR", undefined, undefined],
    [
      "/passkey/verify-authentication",
      400,
      "VALIDATION_ERROR",
      undefined,
      undefined,
    ],
    [
      "/callback/github",
      302,
      undefined,
      "/api/auth/error?error=state_not_found",
      undefined,
    ],
  ] as const)(
    "leaves the audit database untouched for %s returning %i",
    async (path, status, code, location, cookie) => {
      const headers = new Headers();
      if (location) headers.set("location", location);
      if (cookie) headers.append("set-cookie", cookie);
      const response = code
        ? Response.json({ code }, { status, headers })
        : new Response(null, { status, headers });
      const findUserIdByIdentifier = vi.fn();
      const recordHistory = vi.fn();
      const handler = createAuthRequestAuditHandler({
        handle: async () => response,
        getSession: async () => null,
        findUserIdByIdentifier,
        recordHistory,
      });

      expect(
        await handler(new Request(`https://example.test/api/auth${path}`)),
      ).toBe(response);
      expect(findUserIdByIdentifier).not.toHaveBeenCalled();
      expect(recordHistory).not.toHaveBeenCalled();
    },
  );

  it("records an OAuth provider's error redirect without reading a user", async () => {
    const response = new Response(null, {
      status: 302,
      headers: {
        location: "https://example.test/api/auth/error?error=access_denied",
      },
    });
    const findUserIdByIdentifier = vi.fn();
    const recordHistory = vi.fn();
    const handler = createAuthRequestAuditHandler({
      handle: async () => response,
      getSession: async () => null,
      findUserIdByIdentifier,
      recordHistory,
    });

    expect(
      await handler(
        new Request(
          "https://example.test/api/auth/callback/github?state=valid",
        ),
      ),
    ).toBe(response);
    expect(findUserIdByIdentifier).not.toHaveBeenCalled();
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "LOGIN_FAILURE",
        provider: "github",
        userId: null,
      }),
    );
  });

  it("preserves a genuine failed response after the audit budget is exhausted", async () => {
    const response = Response.json(
      { code: "INVALID_EMAIL_OR_PASSWORD" },
      { status: 401 },
    );
    const findUserIdByIdentifier = vi.fn();
    const recordHistory = vi.fn();
    const handler = createAuthRequestAuditHandler({
      handle: async () => response,
      getSession: async () => null,
      findUserIdByIdentifier,
      recordHistory,
      allowFailureAudit: () => false,
    });
    const request = new Request("https://example.test/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email: "reader@example.test",
        password: "fixture",
      }),
    });

    expect(await handler(request)).toBe(response);
    expect(findUserIdByIdentifier).not.toHaveBeenCalled();
    expect(recordHistory).not.toHaveBeenCalled();
  });

  it("replaces the internal Better Auth IP header with the ingress-selected value", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    const handler = createAppAuthRequestHandler(
      { api: { getSession: async () => null } },
      async (request) =>
        Response.json({
          ip: request.headers.get("x-honeycomb-client-ip"),
        }),
    );
    const headers = new Headers({
      "x-honeycomb-client-ip": "198.51.100.11",
      "x-forwarded-for": "198.51.100.12, 203.0.113.8, 10.0.0.1",
    });
    const url = "https://example.test/api/auth/get-session";

    expect(await (await handler(new Request(url, { headers }))).json()).toEqual(
      {
        ip: "203.0.113.8",
      },
    );
    vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
    expect(await (await handler(new Request(url, { headers }))).json()).toEqual(
      {
        ip: "0.0.0.0",
      },
    );
  });

  it("forwards the streamed body of a framework Request proxy without requiring its native brand", async () => {
    function wrap(request: Request): Request {
      return new Proxy(request, {
        get(target, key) {
          if (key === "clone") return () => wrap(target.clone());
          const value: unknown = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    }
    const handler = createAppAuthRequestHandler(
      { api: { getSession: async () => null } },
      async (request) => Response.json(await request.json()),
    );
    const request = new Request(
      "https://example.test/api/auth/sign-in/username",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "fixture" }),
      },
    );
    expect(await (await handler(wrap(request))).json()).toEqual({
      username: "fixture",
    });
  });
});
