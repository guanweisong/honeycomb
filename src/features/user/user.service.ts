import type { UserCommandPort, UserQueryPort } from "./repository";
import { changeUserStatus } from "./user-command-handlers";
import { getCurrentUser } from "./user-queries";
export * from "./user-commands";
export * from "./user-queries";
export * from "./login-history";

/** User 轻量 DDD service：聚合负责账号不变量，service 负责用例编排。 */
export const userService = {
  changeStatus: changeUserStatus,
  current: getCurrentUser,
};

export type { UserCommandPort, UserQueryPort };
