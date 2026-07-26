import type { Logger, LogContext, Metrics } from "../core/contracts";
import type { LogEvent, MetricName } from "../core/names";
import { sanitizeContext, sanitizeMetricLabels } from "../core/sanitize";

export interface MemoryLogEvent {
  level: "info" | "warn" | "error";
  event: LogEvent;
  context: LogContext;
}

export type MemoryMetricEvent =
  | {
    type: "increment";
    name: MetricName;
    labels: Record<string, string>;
  }
  | {
    type: "duration";
    name: MetricName;
    value: number;
    labels: Record<string, string>;
  };

export interface MemoryObservability {
  logger: Logger;
  metrics: Metrics;
  logEvents: MemoryLogEvent[];
  metricEvents: MemoryMetricEvent[];
}

export function createMemoryObservability(): MemoryObservability {
  const logEvents: MemoryLogEvent[] = [];
  const metricEvents: MemoryMetricEvent[] = [];
  const captureLog = (level: MemoryLogEvent["level"], event: LogEvent, context?: LogContext) => {
    logEvents.push({ level, event, context: sanitizeContext(context ?? {}) });
  };

  return {
    logger: {
      info: (event, context) => captureLog("info", event, context),
      warn: (event, context) => captureLog("warn", event, context),
      error: (event, context) => captureLog("error", event, context),
    },
    metrics: {
      increment: (name, labels) => {
        metricEvents.push({
          type: "increment",
          name,
          labels: sanitizeMetricLabels(labels),
        });
      },
      recordDuration: (name, value, labels) => {
        metricEvents.push({
          type: "duration",
          name,
          value,
          labels: sanitizeMetricLabels(labels),
        });
      },
    },
    logEvents,
    metricEvents,
  };
}
