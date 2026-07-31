import type { Instrumentation } from "next";

import { getServerEnv } from "./env/server";
import { LogEvent } from "./packages/observability/core/names";
import {
  configureObservability,
  getLogger,
} from "./packages/observability/server/registry";
import { createRequestContext } from "./packages/observability/server/request-context";

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
    const { requestId } = createRequestContext({ headers: request.headers });

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
