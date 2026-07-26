import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestContext {
  requestId: string;
}

export interface CreateRequestContextOptions {
  requestId?: string;
  headers?: Headers;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(
  options: CreateRequestContextOptions = {},
): RequestContext {
  const requestId = normalizeRequestId(options.requestId)
    ?? normalizeRequestId(options.headers?.get(REQUEST_ID_HEADER))
    ?? crypto.randomUUID();

  return { requestId };
}

export function runWithRequestContext<Result>(
  context: RequestContext,
  operation: () => Result,
): Result {
  return requestContextStorage.run(context, operation);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

function normalizeRequestId(value: string | null | undefined): string | undefined {
  const requestId = value?.trim();
  return requestId || undefined;
}
