import "server-only";

import type { LoginHistoryPort } from "./repository";

/** 查询并转换当前用户的登录历史。 */
export async function getLoginHistory(repository: LoginHistoryPort, userId: string) {
  const history = await repository.loginHistory(userId);
  return history.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }));
}
