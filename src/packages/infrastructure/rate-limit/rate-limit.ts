import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getUpstashEnv } from "@/env/server";
import {
  LogEvent,
  MetricName,
} from "@/packages/infrastructure/observability/core/names";
import {
  getLogger,
  getMetrics,
} from "@/packages/infrastructure/observability/server/registry";

export { getClientIp } from "@/packages/infrastructure/http/client-ip";

const API_RATE_LIMIT = 120;
const API_RATE_LIMIT_WINDOW_MS = 60_000;
const API_RATE_LIMIT_TIMEOUT_MS = 750;

export type ApiRateLimitResponse = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  unavailable?: boolean;
};

export type ApiRatelimit = {
  limit: (identifier: string) => Promise<ApiRateLimitResponse>;
};

type RateLimitEnvironment = "development" | "production" | "test";

export interface RateLimitOptions {
  limit?: number;
  prefix?: string;
}

export interface LimitWithTimeoutOptions {
  environment?: RateLimitEnvironment;
  fallbackLimit?: number;
  timeoutMs?: number;
  windowMs?: number;
}

function unavailableResult(
  environment: RateLimitEnvironment,
  limit: number,
  windowMs: number,
): ApiRateLimitResponse {
  return {
    success: environment !== "production",
    unavailable: true,
    limit,
    remaining: environment === "production" ? 0 : limit,
    reset: Date.now() + windowMs,
  };
}

function recordRateLimitResult(
  result: ApiRateLimitResponse,
  reason?: "provider-error" | "timeout",
) {
  const outcome = result.unavailable
    ? "unavailable"
    : result.success
      ? "allowed"
      : "limited";
  const labels = {
    service: "upstash-rate-limit",
    operation: "limit",
    outcome,
  };
  getMetrics().increment(MetricName.externalServiceOperationsTotal, labels);
  if (result.unavailable) {
    getMetrics().increment(MetricName.externalServiceErrorsTotal, labels);
    getLogger().warn(LogEvent.externalServiceOperation, {
      service: "upstash-rate-limit",
      operation: "limit",
      outcome,
      reason,
    });
  }
}

/** 限制远程限流等待时间，并把超时与 provider 异常收敛为显式环境策略。 */
export async function limitWithTimeout(
  limiter: ApiRatelimit,
  identifier: string,
  options: LimitWithTimeoutOptions = {},
): Promise<ApiRateLimitResponse> {
  const environment = options.environment ?? process.env.NODE_ENV;
  const fallbackLimit = options.fallbackLimit ?? API_RATE_LIMIT;
  const windowMs = options.windowMs ?? API_RATE_LIMIT_WINDOW_MS;
  const timeoutMs = options.timeoutMs ?? API_RATE_LIMIT_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const providerResult = limiter.limit(identifier).then((result) => ({
      kind: "provider" as const,
      result,
    }));
    const outcome = await Promise.race([
      providerResult,
      new Promise<{ kind: "timeout"; result: ApiRateLimitResponse }>((resolve) => {
        timer = setTimeout(
          () =>
            resolve({
              kind: "timeout",
              result: unavailableResult(environment, fallbackLimit, windowMs),
            }),
          timeoutMs,
        );
      }),
    ]);
    recordRateLimitResult(
      outcome.result,
      outcome.kind === "timeout" ? "timeout" : undefined,
    );
    return outcome.result;
  } catch {
    const result = unavailableResult(environment, fallbackLimit, windowMs);
    recordRateLimitResult(result, "provider-error");
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 创建 API 限流器，并在可选的 Upstash 未配置时提供环境相关行为。 */
export function createApiRatelimit(
  options: RateLimitOptions = {},
): ApiRatelimit {
  const limit = options.limit ?? API_RATE_LIMIT;
  const prefix = options.prefix ?? "ratelimit:api";
  const upstash = getUpstashEnv();

  if (!upstash) {
    if (process.env.NODE_ENV === "production") {
      return {
        limit: async () => ({
          success: false,
          unavailable: true,
          limit,
          remaining: 0,
          reset: Date.now() + API_RATE_LIMIT_WINDOW_MS,
        }),
      };
    }

    return {
      limit: async () => ({
        success: true,
        limit,
        remaining: limit,
        reset: Date.now() + API_RATE_LIMIT_WINDOW_MS,
      }),
    };
  }

  const redis = new Redis(upstash);
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, "1 m"),
    analytics: true,
    prefix,
  });
}

/** API 请求入口使用的共享限流器。 */
export const apiRatelimit = createApiRatelimit();

/** 评论创建的独立高成本入口限流器。 */
export const commentCreateRatelimit = createApiRatelimit({
  limit: 5,
  prefix: "ratelimit:comment-create",
});
