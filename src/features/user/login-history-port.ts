import type { LoginHistoryEvent } from "@/packages/identity/account-security/login-history-events";
/** 登录历史查询端口，与用户 CRUD 隔离。 */
export interface LoginHistoryPort {
  loginHistory(userId: string): Promise<
    ReadonlyArray<{
      id: string;
      event: LoginHistoryEvent;
      provider: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
    }>
  >;
}
