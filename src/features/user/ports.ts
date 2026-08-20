import type { UserLevel, UserStatus } from "@/packages/domain/identity/user";
export type { CredentialPort } from "./credential-port";
export type { LoginHistoryPort } from "./login-history-port";

export type QueryValue = string | number | boolean | Array<string | number | boolean>;
export type UserCommandInput = {
  name: string | null;
  email: string | null;
  status?: UserStatus;
  level?: UserLevel;
  password: string;
};
export type UserListInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
} & Record<string, QueryValue | undefined>;
export interface UserRecord {
  id: string;
  email: string | null;
  level: UserLevel;
  name: string | null;
  status: UserStatus;
  createdAt: string | null;
  updatedAt: string | null;
}
export type CurrentUserRecord = Pick<UserRecord, "id" | "email" | "level" | "name" | "status">;
/** 用户用例使用的窄端口，避免新代码依赖组合式 UserRepository。 */
export interface UserCommandPort {
  create(input: UserCommandInput): Promise<UserRecord>;
  update(input: { id: string; password?: string } & Partial<Omit<UserCommandInput, "password">>): Promise<UserRecord>;
  destroy(ids: string[]): Promise<{ success: true }>;
}
export interface UserQueryPort {
  detail(id: string): Promise<{ id: string; name: string | null } | null>;
  current(id: string): Promise<CurrentUserRecord>;
  list(input: UserListInput): Promise<{ list: UserRecord[]; total: number }>;
}
