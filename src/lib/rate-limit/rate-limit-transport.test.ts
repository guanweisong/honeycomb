// @vitest-environment node
import { mockAbortSignalTimeout } from "@tests/helpers/abort-signal-timeout";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiRatelimit, limitWithTimeout } from "./rate-limit";
import { configureObservability } from "@/lib/observability/server/registry";
import { createMemoryObservability } from "@tests/helpers/memory-observability";

const fetchMock = vi.fn<typeof fetch>();

describe("rate limit transport deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "synthetic-token");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    mockAbortSignalTimeout("Timed out");
  });
  afterEach(() => {
    configureObservability();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(["production", "development"] as const)(
    "aborts actual SDK HTTP work and preserves %s fallback",
    async (environment) => {
      const memory = createMemoryObservability();
      configureObservability(memory);
      const limiter = createApiRatelimit();
      const request = limitWithTimeout(limiter, "synthetic-client", {
        environment,
      });
      await vi.advanceTimersByTimeAsync(750);
      expect(await request).toMatchObject({
        success: environment !== "production",
        unavailable: true,
      });
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(memory.logEvents)).not.toContain(
        "synthetic-client",
      );
      expect(JSON.stringify(memory.logEvents)).not.toContain("synthetic-token");
    },
  );

  it("creates a fresh signal for the next invocation rather than reusing an aborted one", async () => {
    const limiter = createApiRatelimit();
    const first = limitWithTimeout(limiter, "first", {
      environment: "production",
    });
    await vi.advanceTimersByTimeAsync(750);
    await first;
    const second = limitWithTimeout(limiter, "second", {
      environment: "production",
    });
    await vi.advanceTimersByTimeAsync(0);
    const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    const secondSignal = fetchMock.mock.calls[1]?.[1]?.signal;
    expect(firstSignal?.aborted).toBe(true);
    expect(secondSignal).toBeDefined();
    expect(secondSignal).not.toBe(firstSignal);
    expect(secondSignal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(750);
    await second;
  });

  it("does not retry a transport failure", async () => {
    fetchMock.mockRejectedValue(new Error("Synthetic provider failure"));
    const request = limitWithTimeout(createApiRatelimit(), "client", {
      environment: "production",
    });
    await vi.advanceTimersByTimeAsync(750);
    expect(await request).toMatchObject({ unavailable: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
