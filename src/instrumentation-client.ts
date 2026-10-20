import * as Sentry from "@sentry/nextjs";
import { sanitizeBrowserError } from "./lib/observability/browser/sentry";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      defaultIntegrations: false,
      integrations: [
        Sentry.globalHandlersIntegration(),
        Sentry.browserApiErrorsIntegration(),
        Sentry.dedupeIntegration(),
      ],
      tracesSampleRate: 0,
      traceLifecycle: "static",
      beforeSend: sanitizeBrowserError,
      beforeSendLog: () => null,
      beforeSendMetric: () => null,
      sendClientReports: false,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
        frameContextLines: 0,
      },
    });
  } catch {
    // Monitoring must never prevent the application from starting.
  }
}
