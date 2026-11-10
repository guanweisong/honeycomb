import type { SerwistPlugin } from "serwist";

const blockedCacheControlDirectives = new Set(["no-store", "private"]);

/**
 * Mirrors Serwist's normal successful/opaque response rule while respecting
 * response directives that must not persist in Cache Storage.
 */
export function isRuntimeResponseCacheable(
  response: Pick<Response, "headers" | "status">,
): boolean {
  if (response.status !== 0 && response.status !== 200) {
    return false;
  }

  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !cacheControl
    .split(",")
    .map((directive) => directive.trim().split("=", 1)[0]?.toLowerCase())
    .some((directive) => blockedCacheControlDirectives.has(directive ?? ""));
}

export const runtimeResponseCacheabilityPlugin: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) =>
    isRuntimeResponseCacheable(response) ? response : null,
  cachedResponseWillBeUsed: async ({ cachedResponse }) =>
    cachedResponse && isRuntimeResponseCacheable(cachedResponse)
      ? cachedResponse
      : null,
};
