import { describe, expect, it } from "vitest";

import { LogEvent, MetricName } from "../core/names";
import { createMemoryObservability } from "./memory";

describe("createMemoryObservability", () => {
  it("captures log and metric events for assertions", () => {
    const observability = createMemoryObservability();

    observability.logger.info(LogEvent.cacheOperation, { namespace: "blog" });
    observability.metrics.increment(MetricName.cacheOperationsTotal, {
      namespace: "post.index",
      operation: "read",
      outcome: "success",
    });
    observability.metrics.recordDuration(MetricName.apiRequestDurationMs, 23, {
      procedure: "post.index",
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
        labels: {
          namespace: "post.index",
          operation: "read",
          outcome: "success",
        },
      },
      {
        type: "duration",
        name: "api.request.duration_ms",
        value: 23,
        labels: { procedure: "post.index", outcome: "success" },
      },
    ]);
  });

  it("uses an empty safe context when a log has no context", () => {
    const observability = createMemoryObservability();

    observability.logger.warn(LogEvent.serverError);
    observability.logger.error(LogEvent.serverError);

    expect(observability.logEvents).toEqual([
      { level: "warn", event: "server.error", context: {} },
      { level: "error", event: "server.error", context: {} },
    ]);
  });
});
