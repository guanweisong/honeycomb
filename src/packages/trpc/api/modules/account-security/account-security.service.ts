import "server-only";

import { listUserLoginHistory } from "@/packages/identity/account-security/server/login-history.repository";
import type { Database } from "@/packages/infrastructure/db/db";

/**
 * 查询当前用户的登录历史并转换为 JSON 安全的视图模型。
 * @param db - 数据库实例。
 * @param userId - 当前登录用户 ID。
 * @returns 按时间倒序排列的登录历史。
 */
export async function getLoginHistory(db: Database, userId: string) {
  const history = await listUserLoginHistory(db, userId);
  return history.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));
}
