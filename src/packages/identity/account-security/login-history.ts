import type * as schema from "@/packages/infrastructure/db/schema";
import { getClientIp } from "@/packages/infrastructure/http/client-ip";

export type LoginHistoryEvent = (typeof schema.loginHistoryEvents)[number];

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
