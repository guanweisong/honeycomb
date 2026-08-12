import { describe, expect, it, vi } from "vitest";
import {
  findUserIdByIdentifier,
  listUserLoginHistory,
  recordLoginHistory,
} from "./login-history.repository";

describe("login history repository", () => {
  it("returns a safe, limited current-user history list", async () => {
    const limit = vi.fn().mockResolvedValue([
      {
        id: "history-1",
        event: "LOGIN_SUCCESS",
        provider: "github",
        ipAddress: "127.0.0.1",
        userAgent: "Browser",
        createdAt: new Date("2026-08-11T00:00:00.000Z"),
      },
    ]);
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({ orderBy: () => ({ limit }) }),
        }),
      }),
    };

    const result = await listUserLoginHistory(db as never, "user-1");

    expect(limit).toHaveBeenCalledWith(50);
    expect(result).toEqual([
      expect.not.objectContaining({
        userId: expect.anything(),
        token: expect.anything(),
      }),
    ]);
    expect(result[0]?.createdAt).toEqual(
      new Date("2026-08-11T00:00:00.000Z"),
    );
  });

  it("resolves a failed login identifier without exposing it", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: "user-1" }]);
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    };

    expect(await findUserIdByIdentifier(db as never, " admin ")).toBe(
      "user-1",
    );
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("writes history and applies retention cleanup", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const where = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: () => ({ values }),
      delete: () => ({ where }),
    };

    await recordLoginHistory(db as never, {
      event: "SIGN_OUT",
      userId: "user-1",
      occurredAt: new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(values).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
  });
});
