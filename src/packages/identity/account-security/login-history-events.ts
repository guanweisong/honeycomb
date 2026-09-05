/** 登录安全审计事件的权威集合；存储与展示边界共同引用。 */
export const loginHistoryEvents = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "SIGN_OUT",
  "REVOKE_OTHER_SESSIONS",
] as const;

export type LoginHistoryEvent = (typeof loginHistoryEvents)[number];
