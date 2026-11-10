// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  findUserIdByIdentifier,
  listUserLoginHistory,
  recordLoginHistory,
} from "@/features/user/account-security/server/login-history.repository";
import { eq, type SQL } from "drizzle-orm";
import { loginHistory } from "@/lib/db/schema/auth";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { asMockDatabase } from "@tests/helpers/test-utils";
import {
  prepareMigrationFolder,
  withTestDatabase,
} from "@tests/helpers/local-test-database";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/lib/db/schema";

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
    const dialect = new SQLiteSyncDialect();
    const orderBy = vi.fn((order: SQL) => {
      expect(dialect.sqlToQuery(order)).toMatchObject({
        sql: '"login_history"."created_at" desc',
        params: [],
      });
      return { limit };
    });
    const where = vi.fn((predicate: SQL) => {
      expect(dialect.sqlToQuery(predicate)).toMatchObject({
        sql: '"login_history"."user_id" = ?',
        params: ["user-1"],
      });
      return { orderBy };
    });
    const select = vi.fn(() => ({ from: () => ({ where }) }));
    const db = { select };

    const result = await listUserLoginHistory(asMockDatabase(db), "user-1");

    expect(where).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledExactlyOnceWith({
      id: loginHistory.id,
      event: loginHistory.event,
      provider: loginHistory.provider,
      ipAddress: loginHistory.ipAddress,
      userAgent: loginHistory.userAgent,
      createdAt: loginHistory.createdAt,
    });
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

    expect(values).toHaveBeenCalledExactlyOnceWith({
      event: "SIGN_OUT",
      userId: "user-1",
      provider: null,
      ipAddress: "anonymous",
      userAgent: null,
      createdAt: new Date("2026-08-11T00:00:00.000Z"),
    });
    expect(where).toHaveBeenCalledOnce();
    const predicate: SQL = where.mock.calls[0]![0];
    expect(new SQLiteSyncDialect().sqlToQuery(predicate)).toMatchObject({
      sql: '"login_history"."created_at" < ?',
      params: [new Date("2026-05-13T00:00:00.000Z").getTime()],
    });
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
      { id: "legacy", email: "Üser@EXAMPLE.TEST" },
      { id: "other", email: "üser@example.test" },
    ],
    "üser@example.test",
    null,
  ],
  [
    [
      { id: "legacy", email: "Key@Example.Test" },
      { id: "other", email: "key@example.test" },
    ],
    "key@example.test",
    null,
  ],
  [
    [
      { id: "null", email: null },
      { id: "other", email: "elsewhere@example.test" },
    ],
    "reader@example.test",
    null,
  ],
  [
    [
      { id: "ordinary", email: "reader@example.test" },
      { id: "spaced", email: " Reader@Example.Test " },
      { id: "nul", email: "reader@example.test\0" },
    ],
    "reader@example.test",
    "ordinary",
  ],
  [
    [{ id: "spaced", email: " Reader@Example.Test " }],
    " READER@EXAMPLE.TEST ",
    "spaced",
  ],
] as const)(
  "resolves email candidates only when normalization is unambiguous",
  async (rows, identifier, expected) => {
    await withTestDatabase(async (client) => {
      const db = drizzle(client, { schema });
      await migrate(db, { migrationsFolder: "drizzle" });
      for (const row of rows) {
        await client.execute({
          sql: 'INSERT INTO "user" ("id", "email") VALUES (?, ?)',
          args: [row.id, row.email],
        });
      }
      await expect(
        findUserIdByIdentifier(db, identifier, "email"),
      ).resolves.toBe(expected);
    });
  },
);

it("uses the normalized index for the real failed-email lookup after upgrading a database", async () => {
  await withTestDatabase(async (client, directory) => {
    const db = drizzle(client, { schema });
    await migrate(db, {
      migrationsFolder: prepareMigrationFolder(directory, 8),
    });
    await db.insert(schema.user).values([
      { id: "legacy", email: "Key@Example.Test" },
      { id: "ordinary", email: "key@example.test" },
    ]);
    await migrate(db, { migrationsFolder: "drizzle" });
    expect(
      await db
        .select({ id: schema.user.id, email: schema.user.email })
        .from(schema.user)
        .orderBy(schema.user.id),
    ).toEqual([
      { id: "legacy", email: "Key@Example.Test" },
      { id: "ordinary", email: "key@example.test" },
    ]);

    const logQuery = vi.fn<(query: string, params: unknown[]) => void>();
    const observed = drizzle(client, { schema, logger: { logQuery } });
    expect(
      await findUserIdByIdentifier(observed, "KEY@EXAMPLE.TEST", "email"),
    ).toBeNull();
    expect(logQuery).toHaveBeenCalledExactlyOnceWith(expect.any(String), [
      "key@example.test",
      2,
    ]);
    const query = logQuery.mock.calls[0]?.[0];
    if (!query) throw new Error("The email query was not observed");
    const plan = await client.execute({
      sql: `EXPLAIN QUERY PLAN ${query}`,
      args: ["key@example.test", 2],
    });
    expect(plan.rows.map(({ detail }) => detail)).toContainEqual(
      expect.stringMatching(/SEARCH .*USING INDEX user_login_email_key_idx/u),
    );
    await db
      .update(schema.user)
      .set({ email: "other@example.test" })
      .where(eq(schema.user.id, "ordinary"));
    expect(await findUserIdByIdentifier(db, "KEY@EXAMPLE.TEST", "email")).toBe(
      "legacy",
    );
  });
});

it("prunes a bounded batch of expired history when recording a login failure", async () => {
  await withTestDatabase(async (client) => {
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(loginHistory).values(
      Array.from({ length: 55 }, () => ({
        event: "LOGIN_FAILURE" as const,
        createdAt: new Date("2026-01-01"),
      })),
    );
    const occurredAt = new Date("2026-08-11");
    await recordLoginHistory(db, { event: "LOGIN_FAILURE", occurredAt });
    const rows = await db
      .select({ createdAt: loginHistory.createdAt })
      .from(loginHistory);
    expect(rows).toHaveLength(6);
    expect(rows).toContainEqual({ createdAt: occurredAt });
  });
});

it("does not prune history when recording the new event fails", async () => {
  const failure = new Error("insert failed");
  const values = vi.fn().mockRejectedValue(failure);
  const remove = vi.fn();
  await expect(
    recordLoginHistory(
      asMockDatabase({
        insert: () => ({ values }),
        delete: remove,
      }),
      { event: "SIGN_OUT", userId: "user-1" },
    ),
  ).rejects.toBe(failure);
  expect(remove).not.toHaveBeenCalled();
});
