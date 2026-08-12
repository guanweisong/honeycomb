import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import * as schema from "@/packages/infrastructure/db/schema";
import type { Database } from "@/packages/infrastructure/db/db";

export type CredentialStore = Pick<Database, "select" | "insert" | "update">;

export function hashCredentialPassword(password: string) {
  return hashPassword(password);
}

export async function setCredentialPassword(
  db: CredentialStore,
  userId: string,
  password: string,
) {
  const passwordHash = await hashCredentialPassword(password);
  const [existingAccount] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "credential"),
      ),
    )
    .limit(1);

  if (existingAccount) {
    await db
      .update(schema.account)
      .set({ password: passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(schema.account.id, existingAccount.id));
    return;
  }

  await db.insert(schema.account).values({
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
  });
}
