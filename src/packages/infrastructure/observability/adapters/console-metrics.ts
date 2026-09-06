import type { MetricLabels, Metrics } from "../core/contracts";
import type { MetricName } from "../core/names";
import { createSafeMetrics } from "../core/safe-adapters";
import { sanitizeMetricLabels } from "../core/sanitize";

export interface ConsoleMetricsOptions {
  service?: string;
  environment?: string;
  write?: (line: string) => void;
}

export function createConsoleMetrics(
  options: ConsoleMetricsOptions = {},
): Metrics {
  const service = options.service ?? "honeycomb";
  const environment = options.environment ?? getEnvironment();
  const write = options.write ?? ((line: string) => console.log(line));

  return createSafeMetrics({
    increment: (name, labels) =>
      writeMetric(
        write,
        name,
        "increment",
        1,
        "count",
        labels,
        service,
        environment,
      ),
    recordDuration: (name, durationMs, labels) =>
      writeMetric(
        write,
        name,
        "record-duration",
        durationMs,
        "ms",
        labels,
        service,
        environment,
      ),
  });
}

function writeMetric(
  write: (line: string) => void,
  name: MetricName,
  operation: "increment" | "record-duration",
  value: number,
  unit: "count" | "ms",
  labels: MetricLabels | undefined,
  service: string,
  environment: string,
): void {
  write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      type: "metric",
      name,
      operation,
      value,
      unit,
      service,
      environment,
      labels: sanitizeMetricLabels(labels),
    }),
  );
}

function getEnvironment(): string {
  return typeof process === "undefined"
    ? "development"
    : process.env.NODE_ENV ?? "development";
}
