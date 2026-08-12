import type { LogEvent, MetricLabelName, MetricName } from "./names";

export type LogContext = Record<string, unknown>;

export type MetricLabels =
  & Partial<Record<MetricLabelName, string>>
  & Record<string, unknown>;

export interface Logger {
  info(event: LogEvent, context?: LogContext): void;
  warn(event: LogEvent, context?: LogContext): void;
  error(event: LogEvent, context?: LogContext): void;
}

export interface Metrics {
  increment(name: MetricName, labels?: MetricLabels): void;
  recordDuration(
    name: MetricName,
    durationMs: number,
    labels?: MetricLabels,
  ): void;
}
