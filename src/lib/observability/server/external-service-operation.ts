import "server-only";

import type {
  externalServices,
  externalServiceOperations,
} from "../core/metric-label-values";
import { MetricName } from "../core/names";
import { getMetrics } from "./registry";

export type ExternalService = (typeof externalServices)[number];
export type ExternalServiceOperation =
  (typeof externalServiceOperations)[number];

export async function observeExternalServiceOperation<T>(
  service: ExternalService,
  operation: ExternalServiceOperation,
  execute: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  let outcome = "success";

  try {
    return await execute();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    const labels = { service, operation, outcome };
    const metrics = getMetrics();
    metrics.increment(MetricName.externalServiceOperationsTotal, labels);
    if (outcome === "error") {
      metrics.increment(MetricName.externalServiceErrorsTotal, labels);
    }
    metrics.recordDuration(
      MetricName.externalServiceOperationDurationMs,
      performance.now() - startedAt,
      labels,
    );
  }
}
