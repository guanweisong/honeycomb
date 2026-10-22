// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { UserLevel } from "@/features/user/types/user.level";
import {
  UserInsertSchema,
  UserUpdateSchema,
} from "@/features/user/schemas/user.write.schema";
import { createUser, updateUser } from "./user-commands";
import { createUserRepository } from "./user-repository";

const authDatabase = vi.hoisted(() => ({ getDb: vi.fn<() => Database>() }));
vi.mock("@/lib/db/db", () => ({ getDb: authDatabase.getDb }));
vi.mock("@/env/server", () => ({
  getAuthEnv: () => ({
    AUTH_URL: "http://localhost:3000",
    AUTH_SECRET: "AdminLoginNameTestSecret12345678901234567890",
  }),
}));
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
  getLogger: () => ({ error: vi.fn() }),
}));

const password = "login-password123";
const invalidator = {
  invalidate: async () => ({ state: "completed" as const }),
};

describe("administrator-managed login names", () => {
  let directory: string | undefined;
  let client: Client | undefined;
  let db: Database;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-login-name-"));
    // The registered afterEach cleans up even if safety checks or migrations fail.
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (typeof process.getuid === "function") {
      expect(stat.uid).toBe(process.getuid());
    }
    const databasePath = resolve(directory, "login.db");
    expect(dirname(databasePath)).toBe(directory);
    const url = `file:${databasePath}`;
    vi.stubEnv("TURSO_URL", url);
    vi.stubEnv("TURSO_TOKEN", "local-test-only");
    vi.resetModules();
    client = createClient({ url });
    await client.execute("pragma foreign_keys = on");
    for (const file of readdirSync("drizzle")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
    }
    db = drizzle(client, { schema });
    authDatabase.getDb.mockReturnValue(db);
  });

  afterEach(() => {
    client?.close();
    client = undefined;
    vi.unstubAllEnvs();
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
      expect(existsSync(directory)).toBe(false);
      directory = undefined;
    }
  });

  async function login(username: string, credentialPassword = password) {
    const { auth } = await import("@/auth");
    return auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/username", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ username, password: credentialPassword }),
      }),
    );
  }

  function create(name: string, email: string) {
    return createUser(
      createUserRepository(db),
      { name, email, password },
      invalidator,
    );
  }

  function rename(id: string, name: string, newPassword?: string) {
    return updateUser(
      createUserRepository(db),
      { id, name, ...(newPassword ? { password: newPassword } : {}) },
      UserLevel.ADMIN,
      invalidator,
    );
  }

  it("authenticates a production-created user with the trimmed, case-preserved name", async () => {
    const user = await create("  Mixed.Case 用户  ", "created@example.test");

    const response = await login("Mixed.Case 用户");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: {
        id: user.id,
        name: "Mixed.Case 用户",
        username: "Mixed.Case 用户",
        displayUsername: "Mixed.Case 用户",
      },
    });
    expect((await login("mixed.case 用户")).status).toBe(401);
  });

  it("renames the real login identifier without changing credentials or existing sessions", async () => {
    const user = await create("OldName", "renamed@example.test");
    expect((await login("OldName")).status).toBe(200);
    const accounts = await db.select().from(schema.account);
    const sessions = await db.select().from(schema.session);

    await rename(user.id, "  NewName  ");

    expect(await db.select().from(schema.account)).toEqual(accounts);
    expect(await db.select().from(schema.session)).toEqual(sessions);
    expect(await db.select().from(schema.user)).toMatchObject([
      {
        id: user.id,
        name: "NewName",
        username: "NewName",
        displayUsername: "NewName",
      },
    ]);
    expect((await login("NewName")).status).toBe(200);
    expect((await login("OldName")).status).toBe(401);
  });

  it.each(["name", "username"] as const)(
    "rejects an existing %s collision without creating a user or credential",
    async (field) => {
      await db.insert(schema.user).values({
        id: "reserved",
        name: "Legacy display",
        username: "Legacy login",
        [field]: "Reserved",
        email: "reserved@example.test",
      });
      const users = await db.select().from(schema.user);

      await expect(
        create("Reserved", "collision@example.test"),
      ).rejects.toThrow();

      expect(await db.select().from(schema.user)).toEqual(users);
      expect(await db.select().from(schema.account)).toEqual([]);
    },
  );

  it.each([
    ["name", false],
    ["name", true],
    ["username", false],
    ["username", true],
  ] as const)(
    "rolls back a rename on %s collision, with password reset: %s",
    async (field, withPassword) => {
      const user = await create("Original", "rename-collision@example.test");
      const now = new Date();
      await db.insert(schema.session).values({
        id: "existing-session",
        token: "existing-token",
        userId: user.id,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 60_000),
      });
      await db.insert(schema.user).values({
        id: "reserved",
        name: "Legacy display",
        username: "Legacy login",
        [field]: "Reserved",
        email: "reserved@example.test",
      });
      const users = await db.select().from(schema.user);
      const accounts = await db.select().from(schema.account);
      const sessions = await db.select().from(schema.session);

      await expect(
        rename(
          user.id,
          "Reserved",
          withPassword ? "changed-password123" : undefined,
        ),
      ).rejects.toThrow();

      expect(await db.select().from(schema.user)).toEqual(users);
      expect(await db.select().from(schema.account)).toEqual(accounts);
      expect(await db.select().from(schema.session)).toEqual(sessions);
    },
  );

  it("authenticates case-distinct identifiers as distinct users", async () => {
    const upper = await create("CaseUser", "upper@example.test");
    const lower = await create("caseuser", "lower@example.test");

    for (const [name, user] of [
      ["CaseUser", upper],
      ["caseuser", lower],
    ] as const) {
      const response = await login(name);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        user: { id: user.id, username: name },
      });
    }
  });

  it.each([
    [{ username: null, displayUsername: null }, "Legacy"],
    [{ username: "LegacyLogin", displayUsername: "LegacyDisplay" }, "Legacy"],
    [{ username: null, displayUsername: null }, " Legacy "],
    [{ username: "LegacyLogin", displayUsername: "LegacyDisplay" }, " Legacy "],
  ] as const)(
    "leaves legacy identifiers unchanged on unrelated writes: %j / %s",
    async (identifiers, storedName) => {
      const id = "000000000000000000000001";
      await db.insert(schema.user).values({
        id,
        name: storedName,
        email: "legacy@example.test",
        ...identifiers,
      });
      await create("Another", "another@example.test");

      await updateUser(
        createUserRepository(db),
        { id, name: "Legacy", email: "updated@example.test" },
        UserLevel.ADMIN,
        invalidator,
      );

      expect(
        await db.select().from(schema.user).where(eq(schema.user.id, id)),
      ).toMatchObject([
        { name: "Legacy", email: "updated@example.test", ...identifiers },
      ]);
    },
  );

  it("never exposes stored credentials or login internals through list/current DTOs", async () => {
    const user = await create("Private", "private@example.test");
    expect(await db.select().from(schema.account)).toEqual([
      expect.objectContaining({
        userId: user.id,
        password: expect.any(String),
      }),
    ]);
    const repository = createUserRepository(db);
    const result = await repository.list({ page: 1, limit: 10 });
    expect(result.list).toHaveLength(1);
    expect(Object.keys(result.list[0]!).sort()).toEqual([
      "createdAt",
      "email",
      "id",
      "level",
      "name",
      "status",
      "updatedAt",
    ]);
    expect(Object.keys(await repository.current(user.id)).sort()).toEqual([
      "email",
      "id",
      "level",
      "name",
      "status",
    ]);
    expect(result.list[0]?.email).toBe("private@example.test");
  });

  it("authenticates the accepted one-character and 32-character login boundaries", async () => {
    await create("a", "short@example.test");
    await create(`  ${"b".repeat(32)}  `, "long@example.test");

    expect((await login("a")).status).toBe(200);
    expect((await login("b".repeat(32))).status).toBe(200);
    expect((await login("b".repeat(33))).status).toBe(422);
  });
});

describe("administrator login-name validation", () => {
  it.each(["a", "a".repeat(32), `  ${"a".repeat(32)}  `])(
    "accepts and trims allowed names on create and rename: %s",
    (name) => {
      expect(
        UserInsertSchema.parse({ name, email: "length@example.test", password })
          .name,
      ).toBe(name.trim());
      expect(
        UserUpdateSchema.parse({ id: "000000000000000000000001", name }).name,
      ).toBe(name.trim());
    },
  );

  it.each(["", "   ", "a".repeat(33)])(
    "rejects invalid login names on create and rename: %j",
    (name) => {
      expect(
        UserInsertSchema.safeParse({
          name,
          email: "length@example.test",
          password,
        }).success,
      ).toBe(false);
      expect(
        UserUpdateSchema.safeParse({ id: "000000000000000000000001", name })
          .success,
      ).toBe(false);
    },
  );
});
