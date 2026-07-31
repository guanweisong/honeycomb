import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getUpstashEnv } from "@/env/server";

const API_RATE_LIMIT = 120;
const API_RATE_LIMIT_WINDOW_MS = 60_000;

type ApiRateLimitResponse = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type ApiRatelimit = {
  limit: (identifier: string) => Promise<ApiRateLimitResponse>;
};

export function createApiRatelimit(): ApiRatelimit {
  const upstash = getUpstashEnv();

  if (!upstash) {
    return {
      limit: async () => ({
        success: true,
        limit: API_RATE_LIMIT,
        remaining: API_RATE_LIMIT,
        reset: Date.now() + API_RATE_LIMIT_WINDOW_MS,
      }),
    };
  }

  const redis = new Redis(upstash);
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(API_RATE_LIMIT, "1 m"),
    analytics: true,
    prefix: "ratelimit:api",
  });
}

export const apiRatelimit = createApiRatelimit();

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const [firstIp] = xForwardedFor.split(",");
    return firstIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "anonymous";
}
