/* eslint-disable @typescript-eslint/no-explicit-any -- adapter 过渡期保持旧 repository 类型兼容。 */
/** 用户用例使用的窄端口，避免新代码依赖组合式 UserRepository。 */
export interface UserCommandPort {
  create(input: any): Promise<any>;
  update(input: any): Promise<any>;
  destroy(ids: string[]): Promise<{ success: true }>;
}
export interface UserQueryPort {
  detail(id: string): Promise<any>;
  current(id: string): Promise<any>;
  list(input: any): Promise<any>;
}
export interface CredentialPort { update(input: any): Promise<any> }
export interface LoginHistoryPort {
  loginHistory(userId: string): Promise<ReadonlyArray<{
    id: string;
    event: "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "SIGN_OUT" | "REVOKE_OTHER_SESSIONS";
    provider: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>>;
}
