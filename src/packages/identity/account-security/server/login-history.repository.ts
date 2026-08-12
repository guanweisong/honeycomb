import "server-only";

import type { Database } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { desc, eq, lt, or } from "drizzle-orm";
import {
  buildLoginHistoryRecord,
  type LoginHistoryRecordInput,
} from "../login-history";

const LOGIN_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const LOGIN_HISTORY_LIMIT = 50;

type LoginHistoryStore = Pick<Database, "select" | "insert" | "delete">;

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
) {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) return null;

  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(
      or(
        eq(schema.user.username, normalizedIdentifier),
        eq(schema.user.email, normalizedIdentifier),
      ),
    )
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
