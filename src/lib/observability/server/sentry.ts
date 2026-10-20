import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createSentryLogger } from "../adapters/sentry";
import { sanitizeContext } from "../core/sanitize";
import { configureObservability, getMetrics } from "./registry";

/** Logs only: no automatic console, request, exception, tracing, or replay collection. */
export function configureSentryLogs(dsn: string): void {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    defaultIntegrations: false,
    enableOpenTelemetrySetup: false,
    enableRuntimeChannelInjection: false,
    includeServerName: false,
    tracesSampleRate: 0,
    traceLifecycle: "static",
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    },
    beforeSend: () => null,
    beforeSendLog: (log) => ({
      ...log,
      attributes: sanitizeContext(log.attributes ?? {}),
    }),
  });
  configureObservability({
    logger: createSentryLogger(Sentry.logger),
    metrics: getMetrics(),
  });
}
