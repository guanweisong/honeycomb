// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client/node";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { withTestDatabase } from "@tests/helpers/local-test-database";
import { createUserRepository } from "@/features/user/server/user-repository";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { getDb } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";

vi.mock("@/lib/db/db", () => ({ getDb: vi.fn() }));
vi.mock("@/env/server", () => ({
  getAuthEnv: () => ({
    AUTH_URL: "http://localhost:3000",
    AUTH_SECRET: "FixturePasswordBoundarySecret123456",
  }),
}));

const currentPassword = "fixture-old-password";
const newPassword = "fixture-new-password";

function sessionCookie(response: Response) {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("better-auth.session_token="))
    ?.split(";")[0];
  if (!cookie) throw new Error("Fixture sign-in did not issue a cookie");
  return cookie;
}

async function withAuthFixture(
  test: (fixture: Awaited<ReturnType<typeof prepareFixture>>) => Promise<void>,
) {
  await withTestDatabase(async (client) => {
    vi.stubEnv("TURSO_URL", "file:unused-because-db-is-injected");
    vi.stubEnv("TURSO_TOKEN", "fixture-local-only");
    vi.resetModules();
    await test(await prepareFixture(client));
  });
}

async function prepareFixture(client: Client) {
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  vi.mocked(getDb).mockReturnValue(db);
  const { auth } = await import("@/auth");

  await db.insert(schema.user).values({
    id: "fixture-user",
    name: "fixture-user",
    username: "fixture-user",
    email: "fixture-user@example.test",
  });
  await db.insert(schema.account).values({
    id: "fixture-credentials",
    providerId: "credential",
    accountId: "fixture-user",
    userId: "fixture-user",
    password: await hashPassword(currentPassword),
  });

  async function request(path: string, body?: object, cookie?: string) {
    const headers = new Headers();
    if (cookie) headers.set("cookie", cookie);
    if (body) headers.set("content-type", "application/json");
    return auth.handler(
      new Request(`http://localhost:3000/api/auth${path}`, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  }

  const signIn = await request("/sign-in/username", {
    username: "fixture-user",
    password: currentPassword,
  });
  expect(signIn.status).toBe(200);
  return { auth, client, db, request, cookie: sessionCookie(signIn) };
}

describe("Better Auth credential boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("revokes existing cookies when the administrator disables a user", async () => {
    await withAuthFixture(async ({ db, request, cookie }) => {
      const users = createUserRepository(db);
      await users.update(
        { id: "fixture-user", status: UserStatus.DISABLE },
        UserLevel.ADMIN,
      );
      expect(await db.select().from(schema.session)).toEqual([]);

      const disabledSignIn = await request("/sign-in/username", {
        username: "fixture-user",
        password: currentPassword,
      });
      expect(disabledSignIn.ok).toBe(false);
      expect(await db.select().from(schema.session)).toEqual([]);

      await users.update(
        { id: "fixture-user", status: UserStatus.ENABLE },
        UserLevel.ADMIN,
      );
      expect(
        (await request("/passkey/generate-register-options", undefined, cookie))
          .status,
      ).toBe(401);
      expect(
        (
          await request("/sign-in/username", {
            username: "fixture-user",
            password: currentPassword,
          })
        ).status,
      ).toBe(200);
    });
  });

  it("blocks a disabled user's legacy cookie from disclosing passkey authentication options", async () => {
    await withAuthFixture(async ({ db, request, cookie }) => {
      const credentialID = "Zml4dHVyZS1wYXNza2V5";
      await db.insert(schema.passkey).values({
        userId: "fixture-user",
        publicKey: "fixture-public-key",
        credentialID,
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
        createdAt: new Date(),
      });
      const path = "/passkey/generate-authenticate-options";
      const active = await request(path, undefined, cookie);
      expect(active.status).toBe(200);
      expect(await active.json()).toMatchObject({
        allowCredentials: [{ id: credentialID }],
      });

      await db.update(schema.user).set({ status: UserStatus.DISABLE });
      const disabled = await request(path, undefined, cookie);
      expect(disabled.status).toBe(403);
      expect(await disabled.json()).toMatchObject({ code: "ACCOUNT_DISABLED" });

      const anonymous = await request(path);
      expect(anonymous.status).toBe(200);
      const anonymousOptions = await anonymous.json();
      expect(anonymousOptions).toHaveProperty("challenge", expect.any(String));
      expect(anonymousOptions).not.toHaveProperty("allowCredentials");
    });
  });

  it("blocks a disabled user's legacy cookie for passwords and passkeys", async () => {
    await withAuthFixture(async ({ auth, db, request, cookie }) => {
      await db.update(schema.user).set({ status: UserStatus.DISABLE });
      expect(await db.select().from(schema.session)).toHaveLength(1);

      const session = await request("/get-session", undefined, cookie);
      expect(session.status).toBe(200);
      expect(await session.json()).toBeNull();
      expect(
        await auth.api.getSession({ headers: new Headers({ cookie }) }),
      ).toBeNull();
      expect((await request("/list-sessions", undefined, cookie)).status).toBe(
        403,
      );

      expect(
        (
          await request(
            "/change-password",
            { currentPassword, newPassword },
            cookie,
          )
        ).status,
      ).toBe(403);
      expect(
        (await request("/passkey/generate-register-options", undefined, cookie))
          .status,
      ).toBe(403);

      await createUserRepository(db).update(
        {
          id: "fixture-user",
          status: UserStatus.ENABLE,
        },
        UserLevel.ADMIN,
      );
      expect(
        (await request("/passkey/generate-register-options", undefined, cookie))
          .status,
      ).toBe(401);
      const [account] = await db.select().from(schema.account);
      expect(
        account?.password &&
          (await verifyPassword({
            hash: account.password,
            password: currentPassword,
          })),
      ).toBe(true);
    });
  });

  it("rolls back the status update if session revocation fails", async () => {
    await withAuthFixture(async ({ client, db }) => {
      await client.executeMultiple(`
        CREATE TRIGGER reject_session_removal BEFORE DELETE ON session
        BEGIN SELECT RAISE(ABORT, 'fixture session revocation failure'); END;
      `);

      await expect(
        createUserRepository(db).update(
          {
            id: "fixture-user",
            status: UserStatus.DISABLE,
          },
          UserLevel.ADMIN,
        ),
      ).rejects.toThrow();
      expect(
        await db.select({ status: schema.user.status }).from(schema.user),
      ).toEqual([{ status: UserStatus.ENABLE }]);
      expect(await db.select().from(schema.session)).toHaveLength(1);
    });
  });

  it("rejects a sign-in cookie whose session insert races with disabling", async () => {
    await withAuthFixture(async ({ auth, db, request }) => {
      const users = createUserRepository(db);
      const { adapter } = await auth.$context;
      const create = adapter.create;
      const insert = vi
        .spyOn(adapter, "create")
        .mockImplementationOnce(async (input) => {
          expect(input.model).toBe("session");
          // The actual SDK session hook has read ENABLE, but its insert
          // has not yet reached storage.
          await users.update(
            {
              id: "fixture-user",
              status: UserStatus.DISABLE,
            },
            UserLevel.ADMIN,
          );
          return create(input);
        });
      try {
        const signIn = await request("/sign-in/username", {
          username: "fixture-user",
          password: currentPassword,
        });
        expect(insert).toHaveBeenCalledOnce();
        const cookie = sessionCookie(signIn);
        const disabled = await request("/get-session", undefined, cookie);
        expect(await disabled.json()).toBeNull();
        expect(
          (
            await request(
              "/passkey/generate-register-options",
              undefined,
              cookie,
            )
          ).status,
        ).toBe(403);

        await users.update(
          { id: "fixture-user", status: UserStatus.ENABLE },
          UserLevel.ADMIN,
        );
        expect(await db.select().from(schema.session)).toEqual([]);
        expect(
          (
            await request(
              "/passkey/generate-register-options",
              undefined,
              cookie,
            )
          ).status,
        ).toBe(401);
      } finally {
        insert.mockRestore();
      }
    });
  });

  it("rolls back SDK session revocation if the password write fails", async () => {
    await withAuthFixture(async ({ client, db, request, cookie }) => {
      const before = await db.select().from(schema.session);
      await client.executeMultiple(`
        CREATE TRIGGER reject_password_update BEFORE UPDATE OF password ON account
        BEGIN SELECT RAISE(ABORT, 'fixture password hash write failure'); END;
      `);

      const response = await request(
        "/change-password",
        {
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        },
        cookie,
      );
      expect(response.status).toBe(500);
      expect(await db.select().from(schema.session)).toEqual(before);
      const [account] = await db
        .select()
        .from(schema.account)
        .where(eq(schema.account.userId, "fixture-user"));
      expect(
        account?.password &&
          (await verifyPassword({
            hash: account.password,
            password: currentPassword,
          })),
      ).toBe(true);

      await client.execute("DROP TRIGGER reject_password_update");
      expect(
        (
          await request(
            "/change-password",
            {
              currentPassword: "fixture-wrong-password",
              newPassword,
              revokeOtherSessions: true,
            },
            cookie,
          )
        ).status,
      ).toBe(400);
      expect(await db.select().from(schema.session)).toEqual(before);
      expect(
        (
          await request(
            "/change-password",
            {
              currentPassword,
              newPassword,
              revokeOtherSessions: true,
            },
            cookie,
          )
        ).status,
      ).toBe(200);
      const after = await db.select().from(schema.session);
      expect(after).toHaveLength(1);
      expect(after[0]?.token).not.toBe(before[0]?.token);
    });
  });
});
