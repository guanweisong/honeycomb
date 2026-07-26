import { describe, expect, it } from "vitest";

import { sanitizeContext, serializeError } from "./sanitize";

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
});

describe("serializeError", () => {
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
