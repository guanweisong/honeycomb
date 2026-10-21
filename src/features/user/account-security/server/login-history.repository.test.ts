import { describe, expect, it, vi } from "vitest";
import {
  findUserIdByIdentifier,
  listUserLoginHistory,
  recordLoginHistory,
} from "./login-history.repository";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { asMockDatabase } from "@tests/helpers/test-utils";

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

    const result = await listUserLoginHistory(asMockDatabase(db), "user-1");

    expect(limit).toHaveBeenCalledWith(50);
    expect(result).toEqual([
      expect.not.objectContaining({
        userId: expect.anything(),
        token: expect.anything(),
      }),
    ]);
    expect(result[0]?.createdAt).toEqual(new Date("2026-08-11T00:00:00.000Z"));
  });

  it("resolves a failed login identifier without exposing it", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: "user-1" }]);
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    };

    expect(
      await findUserIdByIdentifier(asMockDatabase(db), "admin", "username"),
    ).toBe("user-1");
    expect(limit).toHaveBeenCalledWith(1);
  });

  it.each([
    [
      "username",
      "reader@example.test",
      '"user"."username" = ?',
      "reader@example.test",
    ],
    ["username", " Admin ", '"user"."username" = ?', " Admin "],
  ] as const)(
    "matches only the %s login column without cross-account identifier collisions",
    async (field, identifier, sql, value) => {
      const dialect = new SQLiteSyncDialect();
      let query: ReturnType<SQLiteSyncDialect["sqlToQuery"]> | undefined;
      const db = {
        select: () => ({
          from: () => ({
            where: (predicate: SQL) => {
              query = dialect.sqlToQuery(predicate);
              return { limit: vi.fn().mockResolvedValue([]) };
            },
          }),
        }),
      };
      expect(
        await findUserIdByIdentifier(asMockDatabase(db), identifier, field),
      ).toBeNull();
      // A username equal to somebody else's email must not match the email route, or vice versa.
      expect(query).toMatchObject({ sql, params: [value] });
    },
  );

  it("does not query an empty login identifier", async () => {
    const select = vi.fn();
    expect(
      await findUserIdByIdentifier(asMockDatabase({ select }), "  ", "email"),
    ).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it("writes history and applies retention cleanup", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const where = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: () => ({ values }),
      delete: () => ({ where }),
    };

    await recordLoginHistory(asMockDatabase(db), {
      event: "SIGN_OUT",
      userId: "user-1",
      occurredAt: new Date("2026-08-11T00:00:00.000Z"),
    });

    expect(values).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
  });
});

it.each([
  [
    [{ id: "legacy", email: "Reader@Example.Test" }],
    "READER@EXAMPLE.TEST",
    "legacy",
  ],
  [
    [
      { id: "legacy", email: "Reader@Example.Test" },
      { id: "other", email: "reader@example.test" },
    ],
    "reader@example.test",
    null,
  ],
  [
    [{ id: "unicode", email: "Üser@EXAMPLE.TEST" }],
    "üser@example.test",
    "unicode",
  ],
  [
    [
      { id: "null", email: null },
      { id: "other", email: "elsewhere@example.test" },
    ],
    "reader@example.test",
    null,
  ],
] as const)(
  "resolves email candidates only when normalization is unambiguous",
  async (rows, identifier, expected) => {
    const limit = vi.fn().mockResolvedValue([]);
    const db = {
      select: () => ({
        from: () =>
          Object.assign(Promise.resolve(rows), { where: () => ({ limit }) }),
      }),
    };
    await expect(
      findUserIdByIdentifier(asMockDatabase(db), identifier, "email"),
    ).resolves.toBe(expected);
  },
);
