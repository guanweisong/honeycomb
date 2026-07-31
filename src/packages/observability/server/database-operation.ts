import "server-only";

import { databaseQueryNames } from "../core/metric-label-values";
import { MetricName } from "../core/names";
import { getMetrics } from "./registry";

export type DatabaseOperation =
  | "select"
  | "insert"
  | "update"
  | "delete"
  | "transaction";

export type DatabaseQueryName = (typeof databaseQueryNames)[number];

const databaseQueryNameCatalog = new Set<string>(databaseQueryNames);

export async function observeDbOperation<T>(
  queryName: DatabaseQueryName,
  operation: DatabaseOperation,
  execute: () => Promise<T>,
): Promise<T> {
  if (!databaseQueryNameCatalog.has(queryName)) return execute();

  const startedAt = performance.now();
  let outcome = "success";

  try {
    return await execute();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    const labels = { queryName, operation, outcome };
    const metrics = getMetrics();
    metrics.increment(MetricName.databaseOperationsTotal, labels);
    if (outcome === "error") {
      metrics.increment(MetricName.databaseErrorsTotal, labels);
    }
    metrics.recordDuration(
      MetricName.databaseOperationDurationMs,
      performance.now() - startedAt,
      labels,
    );
  }
}
