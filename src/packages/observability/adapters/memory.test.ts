import { describe, expect, it } from "vitest";

import { LogEvent, MetricName } from "../core/names";
import { createMemoryObservability } from "./memory";

describe("createMemoryObservability", () => {
  it("captures log and metric events for assertions", () => {
    const observability = createMemoryObservability();

    observability.logger.info(LogEvent.cacheOperation, { namespace: "blog" });
    observability.metrics.increment(MetricName.cacheOperationsTotal, {
      namespace: "blog",
      operation: "read",
      outcome: "hit",
    });
    observability.metrics.recordDuration(MetricName.apiRequestDurationMs, 23, {
      procedure: "post.list",
      outcome: "success",
    });

    expect(observability.logEvents).toEqual([
      {
        level: "info",
        event: "cache.operation",
        context: { namespace: "blog" },
      },
    ]);
    expect(observability.metricEvents).toEqual([
      {
        type: "increment",
        name: "cache.operations.total",
        labels: { namespace: "blog", operation: "read", outcome: "hit" },
      },
      {
        type: "duration",
        name: "api.request.duration_ms",
        value: 23,
        labels: { procedure: "post.list", outcome: "success" },
      },
    ]);
  });
});
