import type { PaginationInput } from "@/packages/application/pagination";
import type { UserLevel, UserStatus } from "@/packages/domain/identity/user";
export type { CredentialPort } from "./credential-port";
export type { LoginHistoryPort } from "./login-history-port";

export type UserCommandInput = {
  name: string | null;
  email: string | null;
  status?: UserStatus;
  level?: UserLevel;
  password: string;
};
export type UserListInput = PaginationInput & {
  name?: string;
  email?: string;
  status?: string[];
  level?: string[];
};
export interface UserRecord {
  id: string;
  email: string | null;
  level: UserLevel;
  name: string | null;
  status: UserStatus;
  createdAt: string | null;
  updatedAt: string | null;
}
export type CurrentUserRecord = Pick<
  UserRecord,
  "id" | "email" | "level" | "name" | "status"
>;

/** 用户用例使用的窄端口，避免新代码依赖组合式 UserRepository。 */
export interface UserCommandPort {
  create(input: UserCommandInput): Promise<UserRecord>;
  getStatus(id: string): Promise<Pick<UserRecord, "status" | "level"> | null>;
  getStates(
    ids: string[],
  ): Promise<Array<Pick<UserRecord, "id" | "status" | "level">>>;
  update(
    input: { id: string; password?: string } & Partial<
      Omit<UserCommandInput, "password">
    >,
  ): Promise<UserRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
}

export interface UserQueryPort {
  detail(id: string): Promise<{ id: string; name: string | null } | null>;
  current(id: string): Promise<CurrentUserRecord>;
  list(input: UserListInput): Promise<{ list: UserRecord[]; total: number }>;
}
