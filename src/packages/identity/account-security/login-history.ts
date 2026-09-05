import { getClientIp } from "@/packages/infrastructure/http/client-ip";

import type { LoginHistoryEvent } from "./login-history-events";
export type { LoginHistoryEvent } from "./login-history-events";

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
    ipAddress: request ? getClientIp(request) : "anonymous",
    userAgent: request?.headers.get("user-agent") ?? null,
    createdAt: occurredAt,
  };
}
