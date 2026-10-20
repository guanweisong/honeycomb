import type { Instrumentation } from "next";

import { getServerEnv } from "./env/server";
import { LogEvent } from "./packages/infrastructure/observability/core/names";
import {
  configureObservability,
  getLogger,
} from "./packages/infrastructure/observability/server/registry";
import { createRequestContext } from "./packages/infrastructure/observability/server/request-context";

export function register() {
  configureObservability();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    getServerEnv();
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    dsn
  ) {
    return import("./packages/infrastructure/observability/server/sentry")
      .then(({ configureSentryLogs }) => configureSentryLogs(dsn))
      .catch(() => {
        // Telemetry initialization must not prevent the app from serving requests.
      });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  try {
    const { requestId } = createRequestContext({ headers: request.headers });

    getLogger().error(LogEvent.serverError, {
      route: context.routePath,
      method: request.method,
      requestId,
      error,
    });
  } catch {
    // 错误上报不能改变 Next.js 请求错误处理行为。
  }
};
