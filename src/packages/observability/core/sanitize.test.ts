import { describe, expect, it } from "vitest";

import {
  sanitizeContext,
  sanitizeMetricLabels,
  serializeError,
} from "./sanitize";

describe("sanitizeContext", () => {
  it("recursively redacts credentials and personal data", () => {
    const result = sanitizeContext({
      password: "hunter2",
      nested: {
        token: "token-value",
        sessionCookie: "cookie-value",
        authorization: "Bearer secret",
        apiSecret: "another-secret",
        email: "person@example.com",
        clientIp: "203.0.113.7",
      },
      safe: "visible",
    });

    expect(result).toEqual({
      password: "[REDACTED]",
      nested: {
        token: "[REDACTED]",
        sessionCookie: "[REDACTED]",
        authorization: "[REDACTED]",
        apiSecret: "[REDACTED]",
        email: "[REDACTED]",
        clientIp: "[REDACTED]",
      },
      safe: "visible",
    });
  });

  it("turns circular values into safe placeholders", () => {
    const context: Record<string, unknown> = { requestId: "req-1" };
    context.self = context;

    expect(sanitizeContext(context)).toEqual({
      requestId: "req-1",
      self: "[Circular]",
    });
  });

  it("blocks nested request bodies and database parameter containers", () => {
    expect(
      sanitizeContext({
        request: {
          body: { password: "hunter2" },
          input: { token: "token-value" },
          params: { email: "person@example.com" },
          sqlParams: ["secret-value"],
        },
      }),
    ).toEqual({
      request: {
        body: "[REDACTED]",
        input: "[REDACTED]",
        params: "[REDACTED]",
        sqlParams: "[REDACTED]",
      },
    });
  });

  it("rejects unknown complex objects instead of traversing them", () => {
    expect(
      sanitizeContext({ opaque: new Map([["token", "token-value"]]) }),
    ).toEqual({
      opaque: "[Unsupported: Map]",
    });
  });

  it.each([
    "2001:db8::1",
    "::1",
    "fe80::a%en0",
    "::ffff:192.0.2.128",
    "2001:0db8:0000:0000:0000:ff00:0042:8329",
  ])(
    "redacts the IPv6 address %s without damaging ordinary colon text",
    (ip) => {
      expect(
        sanitizeContext({ detail: `client=${ip}; Error: retry: later` }),
      ).toEqual({
        detail: "client=[REDACTED]; Error: retry: later",
      });
    },
  );
});

describe("sanitizeMetricLabels", () => {
  it("keeps only cataloged low-cardinality label values", () => {
    expect(
      sanitizeMetricLabels({
        procedure: "post.index",
        method: "query",
        outcome: "success",
        queryName: "category.list",
        operation: "select",
        namespace: "post.index",
        service: "email",
      }),
    ).toEqual({
      procedure: "post.index",
      method: "query",
      outcome: "success",
      queryName: "category.list",
      operation: "select",
      namespace: "post.index",
      service: "email",
    });
  });

  it("drops sensitive and high-cardinality values even for allowed keys", () => {
    expect(
      sanitizeMetricLabels({
        procedure: "user_01JABCDEF1234567890",
        method: "https://example.test/api/user/123",
        outcome: "request-01JABCDEF1234567890",
        queryName: "resource-550e8400-e29b-41d4-a716-446655440000",
        operation: "permission denied for alice@example.test",
        namespace: "tenant-customer-928374",
        service: "arbitrary free text",
      }),
    ).toEqual({});
  });
});

describe("serializeError", () => {
  it("redacts sensitive values from an error message and stack", () => {
    const error = new Error(
      "email=person@example.com ip=203.0.113.7 token=token-value cookie=session=abc authorization=Bearer bearer-token secret=top-secret",
    );
    error.stack =
      "Error: email=person@example.com cookie=session=abc authorization=Bearer bearer-token";

    const serialized = JSON.stringify(serializeError(error));

    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("203.0.113.7");
    expect(serialized).not.toContain("token-value");
    expect(serialized).not.toContain("session=abc");
    expect(serialized).not.toContain("bearer-token");
    expect(serialized).not.toContain("top-secret");
  });

  it("redacts IPv6 addresses throughout message, stack, and causes", () => {
    const cause = new Error("origin=::ffff:192.0.2.128");
    cause.stack = "Cause: peer fe80::a%en0";
    const error = new Error("client=2001:db8::1; Error: retry: later", {
      cause,
    });
    error.stack = "Error: client [2001:0db8:0000:0000:0000:ff00:0042:8329]";

    const serialized = JSON.stringify(serializeError(error));

    expect(serialized).not.toContain("2001:db8::1");
    expect(serialized).not.toContain("::ffff:192.0.2.128");
    expect(serialized).not.toContain("fe80::a%en0");
    expect(serialized).not.toContain("2001:0db8");
    expect(serialized).toContain("Error: retry: later");
  });

  it("keeps a bounded non-circular cause chain", () => {
    const root = new Error("root");
    root.name = "RootError";
    const middle = new Error("middle", { cause: root });
    middle.name = "MiddleError";
    const outer = new Error("outer", { cause: middle });
    outer.name = "OuterError";
    (root as Error & { cause?: unknown }).cause = outer;

    expect(serializeError(outer, { maxCauseDepth: 2 })).toMatchObject({
      name: "OuterError",
      message: "outer",
      stack: expect.any(String),
      cause: {
        name: "MiddleError",
        message: "middle",
        cause: {
          name: "RootError",
          message: "root",
          cause: "[Truncated]",
        },
      },
    });
  });
});
