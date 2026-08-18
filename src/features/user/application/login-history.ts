import "server-only";

import { listUserLoginHistory } from "@/packages/identity/account-security/server/login-history.repository";
import type { Database } from "@/packages/infrastructure/db/db";

/** 查询并转换当前用户的登录历史。 */
export async function getLoginHistory(db: Database, userId: string) {
  const history = await listUserLoginHistory(db, userId);
  return history.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));
}
