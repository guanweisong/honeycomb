import { normalizeEmail } from "@/lib/auth/email-policy";
import "server-only";

import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { desc, eq, inArray, lt, sql } from "drizzle-orm";
import {
  buildLoginHistoryRecord,
  type LoginHistoryRecordInput,
} from "@/features/user/account-security/login-history";

const LOGIN_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const LOGIN_HISTORY_LIMIT = 50;
const FAILURE_HISTORY_PRUNE_LIMIT = 50;

type LoginHistoryStore = Pick<Database, "select" | "insert" | "delete">;
export type LoginIdentifierField = "username" | "email";

export async function recordLoginHistory(
  db: LoginHistoryStore,
  input: LoginHistoryRecordInput,
) {
  const record = buildLoginHistoryRecord(input);
  await db.insert(schema.loginHistory).values(record);
  const expired = lt(
    schema.loginHistory.createdAt,
    new Date(record.createdAt.getTime() - LOGIN_HISTORY_RETENTION_MS),
  );
  // A genuine failed login may contribute to cleanup, but it must not
  // delete an arbitrarily large expired backlog in one request.
  await db
    .delete(schema.loginHistory)
    .where(
      input.event === "LOGIN_FAILURE"
        ? inArray(
            schema.loginHistory.id,
            db
              .select({ id: schema.loginHistory.id })
              .from(schema.loginHistory)
              .where(expired)
              .orderBy(schema.loginHistory.createdAt)
              .limit(FAILURE_HISTORY_PRUNE_LIMIT),
          )
        : expired,
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
    if (/^[\x00-\x7f]+$/u.test(normalized)) {
      const matches = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.loginEmailKey, normalized))
        .limit(2);
      return matches.length === 1 ? (matches[0]?.id ?? null) : null;
    }

    // Better Auth's current email sign-in validation accepts ASCII only.
    // Preserve exact JavaScript folding for other callers and legacy data.
    const users = await db
      .select({ id: schema.user.id, email: schema.user.email })
      .from(schema.user)
      .where(
        sql`length(${schema.user.email}) <> length(cast(${schema.user.email} as blob))`,
      );
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
