import { UserLevel } from "@/features/user/types/user.level";
import * as schema from "@/lib/db/schema";
import { createClient, type Client } from "@libsql/client/node";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateUser } from "./user-commands";
import { createUserRepository } from "./user-repository";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

describe("administrator credential resets", () => {
  let client: Client;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let directory: string;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-user-credentials-"));
    client = createClient({ url: `file:${join(directory, "credentials.db")}` });
    db = drizzle(client, { schema });
    for (const file of readdirSync("drizzle")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
    }
    await db.insert(schema.user).values(
      ["target", "other"].map((id) => ({
        id,
        name: id,
        email: `${id}@example.com`,
      })),
    );
    await db.insert(schema.account).values({
      id: "target-credential",
      accountId: "target",
      providerId: "credential",
      userId: "target",
      password: "original-hash",
    });
    const now = new Date();
    await db.insert(schema.session).values(
      ["target-1", "target-2", "other-1"].map((id) => ({
        id,
        token: `${id}-token`,
        userId: id.startsWith("target") ? "target" : "other",
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 60_000),
      })),
    );
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
  });

  it("allows an ordinary user's level change", async () => {
    await db
      .update(schema.user)
      .set({ level: UserLevel.EDITOR })
      .where(eq(schema.user.id, "target"));

    const result = await createUserRepository(db).update({
      id: "target",
      level: UserLevel.GUEST,
    });

    expect(result.level).toBe(UserLevel.GUEST);
    expect(await db.select().from(schema.session)).toHaveLength(3);
  });

  it("preserves not-found errors for missing role-update targets", async () => {
    await expect(
      createUserRepository(db).update({
        id: "missing",
        level: UserLevel.GUEST,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([true, false])(
    "rejects stale demotion after promotion without changing data (password: %s)",
    async (withPassword) => {
      const id = "000000000000000000000001";
      await db.insert(schema.user).values({
        id,
        name: "Protected",
        email: "protected@example.com",
        level: UserLevel.EDITOR,
      });
      await db.insert(schema.account).values({
        id: "protected-credential",
        accountId: id,
        providerId: "credential",
        userId: id,
        password: "protected-original-hash",
      });
      const now = new Date();
      await db.insert(schema.session).values({
        id: "protected-session",
        token: "protected-token",
        userId: id,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 60_000),
      });
      const repository = createUserRepository(db);
      const getStatus = repository.getStatus;
      vi.spyOn(repository, "getStatus").mockImplementationOnce(
        async (userId) => {
          const stale = await getStatus(userId);
          expect(stale?.level).toBe(UserLevel.EDITOR);
          // A competing request commits its promotion after the command's read.
          await repository.update({ id: userId, level: UserLevel.ADMIN });
          return stale;
        },
      );
      const cache = {
        invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
      };
      const accounts = await db.select().from(schema.account);
      const sessions = await db.select().from(schema.session);

      await expect(
        updateUser(
          repository,
          {
            id,
            name: "Stale name",
            level: UserLevel.GUEST,
            ...(withPassword ? { password: "new-password123" } : {}),
          },
          UserLevel.ADMIN,
          cache,
        ),
      ).rejects.toMatchObject({
        name: "DomainError",
        code: "PROTECTED_USER",
      });

      const [user] = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, id));
      expect(user).toMatchObject({ level: UserLevel.ADMIN, name: "Protected" });
      expect(await db.select().from(schema.account)).toEqual(accounts);
      expect(await db.select().from(schema.session)).toEqual(sessions);
      expect(cache.invalidate).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    "revokes only the target user's sessions when a credential exists: %s",
    async (hasCredential) => {
      if (!hasCredential) await db.delete(schema.account);

      await createUserRepository(db).update({
        id: "target",
        name: "Renamed",
        password: "new-password123",
      });

      const [account] = await db.select().from(schema.account);
      expect(
        await verifyPassword({
          hash: account?.password ?? "",
          password: "new-password123",
        }),
      ).toBe(true);
      expect(
        (await db.select().from(schema.session)).map(({ id }) => id),
      ).toEqual(["other-1"]);
    },
  );

  it("allows a password-only reset without profile changes", async () => {
    await createUserRepository(db).update({
      id: "target",
      password: "new-password123",
    });

    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, "target"));
    expect(user?.name).toBe("target");
    expect(
      (await db.select().from(schema.session)).map(({ id }) => id),
    ).toEqual(["other-1"]);
  });

  it("preserves sessions for profile-only updates", async () => {
    await createUserRepository(db).update({ id: "target", name: "Renamed" });

    expect(await db.select().from(schema.session)).toHaveLength(3);
    const [account] = await db.select().from(schema.account);
    expect(account?.password).toBe("original-hash");
  });

  it("rolls back the password and profile if session revocation fails", async () => {
    await client.execute(`CREATE TRIGGER reject_session_revocation
      BEFORE DELETE ON session BEGIN
      SELECT RAISE(ABORT, 'session revocation rejected'); END`);

    await expect(
      createUserRepository(db).update({
        id: "target",
        name: "Renamed",
        password: "new-password123",
      }),
    ).rejects.toThrow();

    const [account] = await db.select().from(schema.account);
    expect(account?.password).toBe("original-hash");
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, "target"));
    expect(user?.name).toBe("target");
    expect(await db.select().from(schema.session)).toHaveLength(3);
  });
});

describe("user repository public detail", () => {
  it("user detail 返回安全的 id 和 name", async () => {
    const db = createMockDb();
    const limit = vi.fn().mockResolvedValue([{ id: "user-1", name: "管理员" }]);
    const where = vi.fn().mockReturnValue({ limit });
    db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });

    await expect(
      createUserRepository(asMockDatabase(db)).detail("user-1"),
    ).resolves.toEqual({ id: "user-1", name: "管理员" });
    expect(db.select).toHaveBeenCalledExactlyOnceWith({
      id: schema.user.id,
      name: schema.user.name,
    });
  });
});

describe("required persistence results", () => {
  it.each(["status", "level"])(
    "rejects unknown user %s during state lookup",
    async (field) => {
      const db = createMockDb();
      db.where.mockResolvedValue([
        { status: "ENABLE", level: "GUEST", [field]: "UNKNOWN" },
      ]);
      await expect(
        createUserRepository(asMockDatabase(db)).getStatus("user"),
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    },
  );
});
