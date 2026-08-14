import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserLevel } from "@/packages/domain/identity/user";
import {
  createMockContext,
  createMockDb,
} from "@tests/helpers/test-utils";

const mocks = vi.hoisted(() => ({
  listUserLoginHistory: vi.fn(),
}));

vi.mock("@/packages/identity/account-security/server/login-history.repository", () => ({
  listUserLoginHistory: mocks.listUserLoginHistory,
}));

import { accountSecurityRouter } from "./account-security.router";

describe("accountSecurityRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listUserLoginHistory.mockResolvedValue([
      {
        id: "history-1",
        event: "LOGIN_SUCCESS",
        provider: "passkey",
        ipAddress: "127.0.0.1",
        userAgent: "Browser",
        createdAt: new Date("2026-08-11T00:00:00.000Z"),
      },
    ]);
  });

  it("returns only the current user's login history as a JSON-safe DTO", async () => {
    const db = createMockDb();
    const caller = accountSecurityRouter.createCaller(
      createMockContext(
        { id: "current-user", level: UserLevel.GUEST },
        db,
      ),
    );

    await expect(caller.loginHistory()).resolves.toEqual([
      {
        id: "history-1",
        event: "LOGIN_SUCCESS",
        provider: "passkey",
        ipAddress: "127.0.0.1",
        userAgent: "Browser",
        createdAt: "2026-08-11T00:00:00.000Z",
      },
    ]);
    expect(mocks.listUserLoginHistory).toHaveBeenCalledWith(
      db,
      "current-user",
    );
  });

  it("rejects unauthenticated requests before reading history", async () => {
    const caller = accountSecurityRouter.createCaller(
      createMockContext(null, createMockDb()),
    );

    await expect(caller.loginHistory()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.listUserLoginHistory).not.toHaveBeenCalled();
  });
});
