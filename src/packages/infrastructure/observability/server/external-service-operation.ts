import "server-only";

import { MetricName } from "../core/names";
import { getMetrics } from "./registry";

export type ExternalService = "captcha" | "email" | "object-storage";
export type ExternalServiceOperation =
  | "validate"
  | "send"
  | "put"
  | "presign"
  | "delete";

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
