import { ANONYMOUS_CLIENT_IP, getClientIp } from "@/lib/http/client-ip.server";

import type { LoginHistoryEvent } from "@/features/user/account-security/login-history-events";
export type { LoginHistoryEvent } from "@/features/user/account-security/login-history-events";

export type LoginHistoryRecordInput = {
  event: LoginHistoryEvent;
  provider?: string | null;
  userId?: string | null;
  request?: Request;
  occurredAt?: Date;
};

export function buildLoginHistoryRecord({
  event,
  provider = null,
  userId = null,
  request,
  occurredAt = new Date(),
}: LoginHistoryRecordInput) {
  return {
    event,
    provider,
    userId,
    ipAddress: request ? getClientIp(request) : ANONYMOUS_CLIENT_IP,
    userAgent: request?.headers.get("user-agent") ?? null,
    createdAt: occurredAt,
  };
}
