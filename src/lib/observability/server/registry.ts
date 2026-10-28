import "server-only";

import { createConsoleLogSink } from "@/lib/observability/adapters/console";
import { createConsoleMetricSink } from "@/lib/observability/adapters/console-metrics";
import type { Logger, Metrics } from "@/lib/observability/core/contracts";
import {
  createSafeLogger,
  createSafeMetrics,
} from "@/lib/observability/core/safe-adapters";

export interface ObservabilityConfiguration {
  logger?: Logger;
  metrics?: Metrics;
}

let logger = createSafeLogger(createConsoleLogSink());
let metrics = createSafeMetrics(createConsoleMetricSink());

/** 仅替换提供的输出端；无参数时恢复全部默认输出端。 */
export function configureObservability(
  configuration: ObservabilityConfiguration = {
    logger: createConsoleLogSink(),
    metrics: createConsoleMetricSink(),
  },
): void {
  if (configuration.logger) logger = createSafeLogger(configuration.logger);
  if (configuration.metrics) metrics = createSafeMetrics(configuration.metrics);
}

export function getLogger(): Logger {
  return logger;
}

export function getMetrics(): Metrics {
  return metrics;
}
