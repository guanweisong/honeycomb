import { describe, expect, it, vi } from "vitest";
import { createAuthRequestAuditHandler } from "./auth-request-audit";

describe("createAuthRequestAuditHandler", () => {
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
