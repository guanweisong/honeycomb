import type { UserRecord } from "../application/repository";

/** 用户管理端展示模型，隔离 tRPC 输出契约。 */
export type UserViewModel = UserRecord;
