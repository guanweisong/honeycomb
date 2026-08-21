import type { UserCommandPort, UserQueryPort } from "./repository";
import { changeUserStatus } from "./user-command-handlers";
import { getCurrentUser } from "./user-queries";

export * from "./user-commands";
export * from "./user-queries";
export * from "../login-history";

/** User 用例入口；账号状态不变量由 User 聚合负责。 */
export const userUseCases = {
  changeStatus: changeUserStatus,
  current: getCurrentUser,
};

export type { UserCommandPort, UserQueryPort };
