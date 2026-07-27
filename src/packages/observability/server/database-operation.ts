import "server-only";

import { MetricName } from "../core/names";
import { getMetrics } from "./registry";

export type DatabaseOperation =
  | "select"
  | "insert"
  | "update"
  | "delete"
  | "transaction";

type DatabaseDomain =
  | "auth"
  | "category"
  | "comment"
  | "link"
  | "media"
  | "menu"
  | "page"
  | "post"
  | "setting"
  | "statistics"
  | "tag"
  | "user";

export type DatabaseQueryName = `${DatabaseDomain}.${string}`;

const stableQueryNamePattern =
  /^(?:auth|category|comment|link|media|menu|page|post|setting|statistics|tag|user)(?:\.[a-z]+(?:-[a-z]+)*)+$/;

export async function observeDbOperation<T>(
  queryName: DatabaseQueryName,
  operation: DatabaseOperation,
  execute: () => Promise<T>,
): Promise<T> {
  if (!stableQueryNamePattern.test(queryName)) return execute();

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
