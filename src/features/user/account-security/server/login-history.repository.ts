import { normalizeEmail } from "@/lib/auth/email-policy";
import "server-only";

import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { desc, eq, lt } from "drizzle-orm";
import {
  buildLoginHistoryRecord,
  type LoginHistoryRecordInput,
} from "@/features/user/account-security/login-history";

const LOGIN_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const LOGIN_HISTORY_LIMIT = 50;

type LoginHistoryStore = Pick<Database, "select" | "insert" | "delete">;
export type LoginIdentifierField = "username" | "email";

export async function recordLoginHistory(
  db: Pick<LoginHistoryStore, "insert" | "delete">,
  input: LoginHistoryRecordInput,
) {
  const record = buildLoginHistoryRecord(input);
  await db.insert(schema.loginHistory).values(record);
  await db
    .delete(schema.loginHistory)
    .where(
      lt(
        schema.loginHistory.createdAt,
        new Date(record.createdAt.getTime() - LOGIN_HISTORY_RETENTION_MS),
      ),
    );
}

export async function findUserIdByIdentifier(
  db: Pick<LoginHistoryStore, "select">,
  identifier: string,
  field: LoginIdentifierField,
) {
  if (!identifier.trim()) return null;
  if (field === "email") {
    const normalized = normalizeEmail(identifier);
    const users = await db
      .select({ id: schema.user.id, email: schema.user.email })
      .from(schema.user);
    const matches = users.filter(
      (user) =>
        user.email !== null && normalizeEmail(user.email) === normalized,
    );
    // Historical case collisions cannot safely be attributed to one account.
    return matches.length === 1 ? (matches[0]?.id ?? null) : null;
  }

  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.username, identifier))
    .limit(1);

  return user?.id ?? null;
}

export async function listUserLoginHistory(
  db: Pick<LoginHistoryStore, "select">,
  userId: string,
) {
  return db
    .select({
      id: schema.loginHistory.id,
      event: schema.loginHistory.event,
      provider: schema.loginHistory.provider,
      ipAddress: schema.loginHistory.ipAddress,
      userAgent: schema.loginHistory.userAgent,
      createdAt: schema.loginHistory.createdAt,
    })
    .from(schema.loginHistory)
    .where(eq(schema.loginHistory.userId, userId))
    .orderBy(desc(schema.loginHistory.createdAt))
    .limit(LOGIN_HISTORY_LIMIT);
}
