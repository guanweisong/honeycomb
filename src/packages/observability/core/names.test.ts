import { describe, expect, it } from "vitest";

import { LogEvent, MetricName } from "./names";

describe("observability names", () => {
  it("exposes stable event and metric names", () => {
    expect(LogEvent).toMatchObject({
      requestStarted: "request.started",
      requestCompleted: "request.completed",
      requestFailed: "request.failed",
      serverError: "server.error",
      databaseOperation: "database.operation",
      cacheOperation: "cache.operation",
      externalServiceOperation: "external-service.operation",
    });
    expect(MetricName).toMatchObject({
      apiRequestsTotal: "api.requests.total",
      apiRequestDurationMs: "api.request.duration_ms",
      apiErrorsTotal: "api.errors.total",
      databaseOperationsTotal: "database.operations.total",
      databaseOperationDurationMs: "database.operation.duration_ms",
      databaseErrorsTotal: "database.errors.total",
      cacheOperationsTotal: "cache.operations.total",
      externalServiceOperationsTotal: "external-service.operations.total",
    });
  });
});
