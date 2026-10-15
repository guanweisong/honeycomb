import { createClient, type Client } from "@libsql/client/node";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/packages/infrastructure/db/schema";
import { createUserRepository } from "./user-repository";

vi.mock("@/packages/infrastructure/observability/server", () => ({
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
