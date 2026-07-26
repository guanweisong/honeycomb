import type { Instrumentation } from "next";

import { getServerEnv } from "./env/server";
import { LogEvent } from "./packages/observability/core/names";
import {
  configureObservability,
  getLogger,
} from "./packages/observability/server/registry";

export function register() {
  configureObservability();

  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    getServerEnv();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  try {
    const requestId = readRequestId(request.headers)?.trim() || crypto.randomUUID();

    getLogger().error(LogEvent.serverError, {
      route: context.routePath,
      method: request.method,
      requestId,
      error,
    });
  } catch {
    // Error reporting must not change Next.js request error handling.
  }
};

function readRequestId(
  headers: Readonly<Record<string, string | string[] | undefined>>,
): string | undefined {
  const value = headers["x-request-id"] ?? headers["X-Request-Id"];
  return Array.isArray(value) ? value[0] : value;
}
