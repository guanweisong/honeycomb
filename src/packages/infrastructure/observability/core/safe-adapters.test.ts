import { describe, expect, it } from "vitest";

import type { Logger, Metrics } from "./contracts";
import { LogEvent, MetricName } from "./names";
import { createSafeLogger, createSafeMetrics } from "./safe-adapters";

describe("safe observability adapters", () => {
  it("swallows logger adapter failures", () => {
    const failingLogger: Logger = {
      info: () => {
        throw new Error("logger unavailable");
      },
      warn: () => {
        throw new Error("logger unavailable");
      },
      error: () => {
        throw new Error("logger unavailable");
      },
    };

    expect(() =>
      createSafeLogger(failingLogger).error(LogEvent.serverError, {
        requestId: "req-1",
      }),
    ).not.toThrow();
  });

  it("redacts sensitive error details before invoking a logger adapter", () => {
    const captured: unknown[] = [];
    const logger: Logger = {
      info: () => undefined,
      warn: () => undefined,
      error: (_event, context) => captured.push(context),
    };
    const error = new Error("token=token-value email=person@example.com");
    error.stack = "Error: authorization=Bearer bearer-token";

    createSafeLogger(logger).error(LogEvent.serverError, { error });

    const serialized = JSON.stringify(captured);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("token-value");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("bearer-token");
  });

  it("swallows metrics adapter failures while discarding unsafe labels", () => {
    const seen: unknown[] = [];
    const failingMetrics: Metrics = {
      increment: (_name, labels) => {
        seen.push(labels);
        throw new Error("metrics unavailable");
      },
      recordDuration: () => {
        throw new Error("metrics unavailable");
      },
    };

    expect(() =>
      createSafeMetrics(failingMetrics).increment(MetricName.apiRequestsTotal, {
        procedure: "post.index",
        userId: "usr-123",
        resourceId: "post-456",
        requestId: "req-789",
        url: "https://honeycomb.example/posts/456",
        error: "free-form failure",
      }),
    ).not.toThrow();
    expect(seen).toEqual([{ procedure: "post.index" }]);
  });
});
