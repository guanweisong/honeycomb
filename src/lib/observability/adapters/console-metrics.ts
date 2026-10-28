import type { MetricLabels, Metrics } from "@/lib/observability/core/contracts";
import type { MetricName } from "@/lib/observability/core/names";
import {
  getRuntimeEnvironment,
  type ConsoleAdapterOptions,
} from "@/lib/observability/adapters/console-options";

/** 内部指标输出端；调用方必须使用安全指标 facade。 */
export function createConsoleMetricSink(
  options: ConsoleAdapterOptions = {},
): Metrics {
  const service = options.service ?? "honeycomb";
  const environment = options.environment ?? getRuntimeEnvironment();
  const write = options.write ?? ((line: string) => console.log(line));

  return {
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
  };
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
      labels,
    }),
  );
}
