import type { InferInsertModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { account } from "@/packages/db/schema";
import { getDb } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";

export type LegacyPasswordUser = {
  id: string;
  password: string | null;
};

export type LegacyNamedUser = {
  id: string;
  name: string | null;
  username: string | null;
};

export type ExistingAuthAccount = {
  userId: string;
  providerId: string;
};

export function buildUsernameBackfillRows(users: LegacyNamedUser[]) {
  return users.flatMap((user) => {
    if (user.username || !user.name) return [];
    return [{ id: user.id, username: user.name, displayUsername: user.name }];
  });
}

export function buildCredentialAccountRows(
  users: LegacyPasswordUser[],
  existingAccounts: ExistingAuthAccount[],
): Array<InferInsertModel<typeof account>> {
  const migratedUserIds = new Set(
    existingAccounts
      .filter((item) => item.providerId === "credential")
      .map((item) => item.userId),
  );

  return users.flatMap((user) => {
    if (!user.password || migratedUserIds.has(user.id)) return [];

    return [
      {
        id: `credential-${user.id}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: user.password,
      },
    ];
  });
}

export async function migrateLegacyCredentialAccounts() {
  const db = getDb();
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      username: schema.user.username,
      password: schema.user.password,
    })
    .from(schema.user);
  const existingAccounts = await db
    .select({ userId: schema.account.userId, providerId: schema.account.providerId })
    .from(schema.account);
  const rows = buildCredentialAccountRows(users, existingAccounts);

  if (rows.length > 0) {
    await db.insert(schema.account).values(rows);
  }

  const usernameRows = buildUsernameBackfillRows(users);
  for (const row of usernameRows) {
    await db
      .update(schema.user)
      .set({ username: row.username, displayUsername: row.displayUsername })
      .where(eq(schema.user.id, row.id));
  }

  return { migrated: rows.length, usernamesBackfilled: usernameRows.length };
}
