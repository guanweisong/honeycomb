import "server-only";

import { createConsoleLogger } from "@/lib/observability/adapters/console";
import { createConsoleMetrics } from "@/lib/observability/adapters/console-metrics";
import type { Logger, Metrics } from "@/lib/observability/core/contracts";
import { createSafeLogger, createSafeMetrics } from "@/lib/observability/core/safe-adapters";

export interface ObservabilityConfiguration {
  logger?: Logger;
  metrics?: Metrics;
}

let logger = createSafeLogger(createConsoleLogger());
let metrics = createSafeMetrics(createConsoleMetrics());

export function configureObservability(
  configuration: ObservabilityConfiguration = {},
): void {
  logger = createSafeLogger(configuration.logger ?? createConsoleLogger());
  metrics = createSafeMetrics(configuration.metrics ?? createConsoleMetrics());
}

export function getLogger(): Logger {
  return logger;
}

export function getMetrics(): Metrics {
  return metrics;
}
