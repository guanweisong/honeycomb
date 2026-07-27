export const LogEvent = {
  requestStarted: "request.started",
  requestCompleted: "request.completed",
  requestFailed: "request.failed",
  authorizationDenied: "authorization.denied",
  serverError: "server.error",
  databaseOperation: "database.operation",
  cacheOperation: "cache.operation",
  externalServiceOperation: "external-service.operation",
  clientError: "client.error",
} as const;

export type LogEvent = (typeof LogEvent)[keyof typeof LogEvent];

export const MetricName = {
  apiRequestsTotal: "api.requests.total",
  apiRequestDurationMs: "api.request.duration_ms",
  apiErrorsTotal: "api.errors.total",
  databaseOperationsTotal: "database.operations.total",
  databaseOperationDurationMs: "database.operation.duration_ms",
  databaseErrorsTotal: "database.errors.total",
  cacheOperationsTotal: "cache.operations.total",
  externalServiceOperationsTotal: "external-service.operations.total",
  externalServiceOperationDurationMs:
    "external-service.operation.duration_ms",
  externalServiceErrorsTotal: "external-service.errors.total",
} as const;

export type MetricName = (typeof MetricName)[keyof typeof MetricName];

export const metricLabelNames = [
  "procedure",
  "method",
  "outcome",
  "queryName",
  "operation",
  "namespace",
  "service",
] as const;

export type MetricLabelName = (typeof metricLabelNames)[number];
