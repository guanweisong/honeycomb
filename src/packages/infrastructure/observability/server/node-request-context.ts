import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import type { RequestContext } from "./request-context";

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<Result>(
  context: RequestContext,
  operation: () => Result,
): Result {
  return requestContextStorage.run(context, operation);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
