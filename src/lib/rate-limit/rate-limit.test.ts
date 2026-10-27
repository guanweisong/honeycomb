// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiRatelimit, limitWithTimeout } from "@/lib/rate-limit/rate-limit";

import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { configureObservability } from "@/lib/observability/server/registry";
import { MetricName } from "@/lib/observability/core/names";

const originalEnv = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

describe("API rate limiting", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.url;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.token;
    vi.unstubAllEnvs();
  });

  it("allows requests without constructing Redis when Upstash env is missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const apiRatelimit = createApiRatelimit();
    const result = await apiRatelimit.limit("127.0.0.1");

    expect(result.success).toBe(true);
    expect(result.limit).toBe(120);
    expect(result.remaining).toBe(120);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it("constructs Upstash rate limiter when env is configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const apiRatelimit = createApiRatelimit();

    expect(apiRatelimit.limit).toEqual(expect.any(Function));
  });

  it("reports unavailable instead of allowing production requests without Upstash", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await createApiRatelimit().limit("127.0.0.1");

    expect(result).toMatchObject({ success: false, unavailable: true });
  });

  it("bounds production provider waits and fails closed", async () => {
    vi.useFakeTimers();
    const pending = { limit: vi.fn(() => new Promise<never>(() => {})) };

    const resultPromise = limitWithTimeout(pending, "client", {
      environment: "production",
      timeoutMs: 50,
    });
    await vi.advanceTimersByTimeAsync(50);

    await expect(resultPromise).resolves.toMatchObject({
      success: false,
      unavailable: true,
    });
    vi.useRealTimers();
  });

  it("marks development provider failures unavailable while allowing locally", async () => {
    const failing = {
      limit: vi.fn().mockRejectedValue(new Error("provider offline")),
    };

    await expect(
      limitWithTimeout(failing, "client", { environment: "development" }),
    ).resolves.toMatchObject({ success: true, unavailable: true });
  });
});

describe("rate-limit metric labels through the safe registry", () => {
  afterEach(() => {
    configureObservability();
    vi.useRealTimers();
  });

  it.each(["allowed", "limited", "unavailable", "timeout"] as const)(
    "retains bounded labels for %s",
    async (outcome) => {
      const memory = createMemoryObservability();
      configureObservability(memory);
      vi.useFakeTimers();
      const limiter = {
        limit: async () => {
          if (outcome === "unavailable")
            throw new Error("dummy provider failure");
          if (outcome === "timeout") return new Promise<never>(() => {});
          return {
            success: outcome === "allowed",
            limit: 10,
            remaining: outcome === "allowed" ? 9 : 0,
            reset: 1000,
          };
        },
      };
      const pending = limitWithTimeout(limiter, "dummy-client", {
        environment: "production",
        timeoutMs: 50,
      });
      if (outcome === "timeout") await vi.advanceTimersByTimeAsync(50);
      await pending;
      const labels = {
        service: "upstash-rate-limit",
        operation: "limit",
        outcome: outcome === "timeout" ? "unavailable" : outcome,
      };
      expect(memory.metricEvents).toEqual([
        {
          type: "increment",
          name: MetricName.externalServiceOperationsTotal,
          labels,
        },
        ...(outcome === "unavailable" || outcome === "timeout"
          ? [
              {
                type: "increment",
                name: MetricName.externalServiceErrorsTotal,
                labels,
              },
            ]
          : []),
      ]);
    },
  );
});
