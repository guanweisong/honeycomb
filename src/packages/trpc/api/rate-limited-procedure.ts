import "server-only";

import { TRPCError } from "@trpc/server";
import { getClientIp } from "@/packages/infrastructure/http/client-ip";
import {
  limitWithTimeout,
  type ApiRatelimit,
} from "@/packages/infrastructure/rate-limit/rate-limit";
import { publicProcedure } from "./core";

export interface RateLimitedPublicProcedureOptions {
  limiter: ApiRatelimit;
  namespace: string;
  fallbackLimit?: number;
  timeoutMs?: number;
}

/** 在公共 handler 前组合独立限流，不复制业务或鉴权规则。 */
export function createRateLimitedPublicProcedure({
  limiter,
  namespace,
  fallbackLimit = 5,
  timeoutMs,
}: RateLimitedPublicProcedureOptions) {
  return publicProcedure.use(async ({ ctx, next }) => {
    const clientIp = getClientIp({ headers: ctx.header });
    const result = await limitWithTimeout(
      limiter,
      `${namespace}:${clientIp}`,
      { fallbackLimit, timeoutMs },
    );

    if (!result.success) {
      throw new TRPCError({
        code: result.unavailable ? "SERVICE_UNAVAILABLE" : "TOO_MANY_REQUESTS",
        message: result.unavailable
          ? "Rate limiting is temporarily unavailable."
          : "Too many requests.",
      });
    }

    return next();
  });
}
