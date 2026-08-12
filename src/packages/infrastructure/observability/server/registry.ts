import "server-only";

import { createConsoleLogger } from "../adapters/console";
import { noopMetrics } from "../adapters/noop";
import type { Logger, Metrics } from "../core/contracts";
import { createSafeLogger, createSafeMetrics } from "../core/safe-adapters";

export interface ObservabilityConfiguration {
  logger?: Logger;
  metrics?: Metrics;
}

let logger = createSafeLogger(createConsoleLogger());
let metrics = createSafeMetrics(noopMetrics);

export function configureObservability(
  configuration: ObservabilityConfiguration = {},
): void {
  logger = createSafeLogger(configuration.logger ?? createConsoleLogger());
  metrics = createSafeMetrics(configuration.metrics ?? noopMetrics);
}

export function getLogger(): Logger {
  return logger;
}

export function getMetrics(): Metrics {
  return metrics;
}
