import type { UserCommandPort, UserQueryPort } from "../ports";
import type { LoginHistoryPort } from "../login-history-port";
export type { CredentialPort, LoginHistoryPort, UserCommandPort, UserQueryPort } from "../ports";
export type { UserListInput, UserCommandInput, UserRecord, CurrentUserRecord } from "../ports";
export interface UserRepository extends UserCommandPort, UserQueryPort, LoginHistoryPort {}
