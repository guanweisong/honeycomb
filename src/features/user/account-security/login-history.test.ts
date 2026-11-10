// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLoginHistoryRecord,
  type LoginHistoryEvent,
} from "@/features/user/account-security/login-history";

describe("login history", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds a redacted history record from request metadata", () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    const request = new Request(
      "https://example.test/api/auth/sign-in/username",
      {
        headers: {
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "user-agent": "Test Browser",
        },
      },
    );
    const occurredAt = new Date("2026-08-11T00:00:00.000Z");

    expect(
      buildLoginHistoryRecord({
        event: "LOGIN_FAILURE" satisfies LoginHistoryEvent,
        provider: "username",
        userId: "user-1",
        request,
        occurredAt,
      }),
    ).toEqual({
      event: "LOGIN_FAILURE",
      provider: "username",
      userId: "user-1",
      ipAddress: "203.0.113.10",
      userAgent: "Test Browser",
      createdAt: occurredAt,
    });
  });

  it("does not include raw credentials in a history record", () => {
    const request = new Request(
      "https://example.test/api/auth/sign-in/username",
      { headers: { "user-agent": "Test Browser" } },
    );

    const record = buildLoginHistoryRecord({
      event: "LOGIN_FAILURE",
      provider: "username",
      request,
    });

    expect(record).not.toHaveProperty("password");
    expect(record).not.toHaveProperty("username");
  });
});
