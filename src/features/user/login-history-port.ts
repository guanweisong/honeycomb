/** 登录历史查询端口，与用户 CRUD 隔离。 */
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
