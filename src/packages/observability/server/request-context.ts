export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestContext {
  requestId: string;
}

export interface CreateRequestContextOptions {
  requestId?: string;
  headers?: RequestHeaders;
}

export type RequestHeaders = Headers | Readonly<Record<string, string | string[] | undefined>>;

export function createRequestContext(
  options: CreateRequestContextOptions = {},
): RequestContext {
  const requestId = normalizeRequestId(options.requestId)
    ?? getRequestIdFromHeaders(options.headers)
    ?? crypto.randomUUID();

  return { requestId };
}

export function getRequestIdFromHeaders(
  headers: RequestHeaders | undefined,
): string | undefined {
  if (!headers) return undefined;

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return normalizeRequestId(headers.get(REQUEST_ID_HEADER));
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === REQUEST_ID_HEADER) {
      return normalizeRequestId(Array.isArray(value) ? value[0] : value);
    }
  }

  return undefined;
}

function normalizeRequestId(value: string | null | undefined): string | undefined {
  const requestId = value?.trim();
  return requestId || undefined;
}
