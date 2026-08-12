import type { Logger, Metrics } from "./contracts";
import { sanitizeContext, sanitizeMetricLabels } from "./sanitize";

export function createSafeLogger(logger: Logger): Logger {
  return {
    info: (event, context) => safely(() => logger.info(event, sanitizeContext(context ?? {}))),
    warn: (event, context) => safely(() => logger.warn(event, sanitizeContext(context ?? {}))),
    error: (event, context) => safely(() => logger.error(event, sanitizeContext(context ?? {}))),
  };
}

export function createSafeMetrics(metrics: Metrics): Metrics {
  return {
    increment: (name, labels) =>
      safely(() => metrics.increment(name, sanitizeMetricLabels(labels))),
    recordDuration: (name, durationMs, labels) =>
      safely(() =>
        metrics.recordDuration(name, durationMs, sanitizeMetricLabels(labels)),
      ),
  };
}

function safely(operation: () => void): void {
  try {
    operation();
  } catch {
    // Observability must never affect the caller or recursively report itself.
  }
}
