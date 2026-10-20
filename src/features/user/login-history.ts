import "server-only";
import type { Database } from "@/lib/db/db";
import { listUserLoginHistory } from "./account-security/server/login-history.repository";

/** Read only this user's history and return JSON-safe timestamps. */
export async function getLoginHistory(
  db: Pick<Database, "select">,
  userId: string,
) {
  const history = await listUserLoginHistory(db, userId);
  return history.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));
}
