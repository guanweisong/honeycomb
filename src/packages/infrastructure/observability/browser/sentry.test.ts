import { describe, expect, it } from "vitest";
import { sanitizeBrowserError } from "./sentry";

describe("browser error privacy", () => {
  it("retains error locations but no arbitrary user, request, message or scope data", () => {
    const result = sanitizeBrowserError({
      type: undefined,
      event_id: "123",
      timestamp: 123,
      platform: "javascript",
      environment: "preview",
      level: "error",
      message: "private-message",
      user: { id: "private-user" },
      request: { url: "https://private.invalid/admin?token=private-token" },
      breadcrumbs: [{ message: "private-console" }],
      extra: { password: "private-password" },
      tags: { id: "private-id" },
      exception: {
        values: [
          {
            type: "TypeError",
            value: "private-error",
            mechanism: {
              type: "onerror",
              handled: false,
              data: { private: "private-value" },
            },
            stacktrace: {
              frames: [
                {
                  filename:
                    "https://app.invalid/_next/static/chunks/abc.js?token=private-token#private-fragment",
                  lineno: 12,
                  colno: 4,
                  function: "private-function",
                  vars: { value: "private-var" },
                },
                {
                  filename: "https://app.invalid/admin/private-user",
                  lineno: 9,
                },
              ],
            },
          },
        ],
      },
    });
    expect(result?.exception?.values?.[0]).toMatchObject({
      type: "TypeError",
      value: "[REDACTED]",
      stacktrace: {
        frames: [
          { filename: "/_next/static/chunks/abc.js", lineno: 12, colno: 4 },
          { filename: "[REDACTED]", lineno: 9 },
        ],
      },
    });
    expect(result?.environment).toBe("preview");
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("drops non-exception messages and redacts custom error names", () => {
    expect(
      sanitizeBrowserError({ type: undefined, message: "private" }),
    ).toBeNull();
    expect(
      sanitizeBrowserError({
        type: undefined,
        exception: { values: [{ type: "private-user" }] },
      })?.exception?.values?.[0]?.type,
    ).toBe("Error");
  });
});
