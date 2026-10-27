// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { Logger, Metrics } from "@/lib/observability/core/contracts";
import { LogEvent, MetricName } from "@/lib/observability/core/names";

describe("observability contracts", () => {
  it("allows a logger and metrics implementation to serve the stable contracts", () => {
    const logger: Logger = {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
    const metrics: Metrics = {
      increment: () => undefined,
      recordDuration: () => undefined,
    };

    logger.info(LogEvent.requestStarted, { requestId: "req-1" });
    metrics.recordDuration(MetricName.apiRequestDurationMs, 12, {
      procedure: "post.index",
      outcome: "success",
    });

    expect(logger).toBeDefined();
    expect(metrics).toBeDefined();
  });
});
