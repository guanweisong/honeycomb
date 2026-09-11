import type { RouteMatchCallbackOptions } from "serwist";
import { CacheFirst, Strategy } from "serwist";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isRuntimeResponseCacheable,
  runtimeResponseCacheabilityPlugin,
} from "./service-worker-cache-policy";
import { runtimeCache } from "./service-worker-runtime-cache";

function runtimeRequest(
  pathname: string,
  headers: Record<string, string> = {},
): RouteMatchCallbackOptions {
  return {
    event: new Event("fetch") as unknown as RouteMatchCallbackOptions["event"],
    request: new Request(`https://honeycomb.test${pathname}`, { headers }),
    sameOrigin: true,
    url: new URL(pathname, "https://honeycomb.test"),
  };
}

function matchingStrategies(request: RouteMatchCallbackOptions) {
  return runtimeCache.filter(({ matcher }) => {
    if (matcher instanceof RegExp) return matcher.test(request.url.href);
    if (typeof matcher === "string") return request.url.href.includes(matcher);
    return Boolean(matcher(request));
  });
}

class TestExtendableEvent {
  waitUntil(promise: Promise<unknown>): void {
    void promise;
  }
}

class TestFetchEvent extends TestExtendableEvent {}

function firstRegisteredCacheFirstStrategy(): CacheFirst {
  const strategy = runtimeCache.find(
    ({ handler }) => handler instanceof CacheFirst,
  )?.handler;

  if (!(strategy instanceof CacheFirst)) {
    throw new Error("Expected a registered CacheFirst runtime strategy");
  }

  return strategy;
}

async function respondWithRegisteredCacheFirst(cachedResponse: Response) {
  const cacheMatch = vi.fn().mockResolvedValue(cachedResponse);
  const fetchFromNetwork = vi
    .fn()
    .mockResolvedValue(new Response("network response", { status: 500 }));
  vi.stubGlobal("caches", { match: cacheMatch });
  vi.stubGlobal("fetch", fetchFromNetwork);

  const strategy = firstRegisteredCacheFirstStrategy();
  const plugins = strategy.plugins;
  strategy.plugins = [runtimeResponseCacheabilityPlugin];

  try {
    const [responseDone, cacheDone] = strategy.handleAll({
      event: new TestExtendableEvent() as unknown as RouteMatchCallbackOptions["event"],
      request: new Request("https://fonts.gstatic.com/inter.woff2"),
    });

    const response = await responseDone;
    await cacheDone;
    return { fetchFromNetwork, response };
  } finally {
    strategy.plugins = plugins;
  }
}

describe("Service Worker runtime cache policy", () => {
  beforeEach(() => {
    vi.stubGlobal("ExtendableEvent", TestExtendableEvent);
    vi.stubGlobal("FetchEvent", TestFetchEvent);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("installs the shared response guard on every runtime strategy", () => {
    expect(
      runtimeCache.every(({ handler }) =>
        handler instanceof Strategy &&
        handler.plugins.includes(runtimeResponseCacheabilityPlugin),
      ),
    ).toBe(true);
  });

  it.each([
    runtimeRequest("/api/posts", { "Content-Type": "text/html" }),
    runtimeRequest("/api/posts", { RSC: "1" }),
    runtimeRequest("/api/response.json"),
    runtimeRequest("/admin/dashboard", { "Content-Type": "text/html" }),
    runtimeRequest("/admin/dashboard", { RSC: "1" }),
    runtimeRequest("/admin/dashboard.js"),
  ])("does not register a matching cache strategy for private requests", (request) => {
    expect(matchingStrategies(request)).toEqual([]);
  });

  it("registers strategies for public document, RSC, and static asset requests", () => {
    expect(
      matchingStrategies(runtimeRequest("/en/posts", { "Content-Type": "text/html" })),
    ).not.toEqual([]);
    expect(matchingStrategies(runtimeRequest("/en/posts", { RSC: "1" }))).not.toEqual(
      [],
    );
    expect(matchingStrategies(runtimeRequest("/_next/static/app.js"))).not.toEqual([]);
  });

  it.each([
    ["private", new Response("private", { headers: { "Cache-Control": "private, max-age=60" } }), false],
    ["no-store", new Response("no-store", { headers: { "Cache-Control": "public, no-store" } }), false],
    ["cacheable", new Response("cacheable", { headers: { "Cache-Control": "public, max-age=60" } }), true],
  ])("treats %s responses as cacheable: %s", (_name, response, expected) => {
    expect(isRuntimeResponseCacheable(response)).toBe(expected);
  });

  it.each([
    ["private", "private, max-age=60"],
    ["no-store", "public, no-store"],
  ])("does not serve a %s legacy runtime cache response", async (_name, cacheControl) => {
    const { fetchFromNetwork, response } = await respondWithRegisteredCacheFirst(
      new Response("forbidden cache", { headers: { "Cache-Control": cacheControl } }),
    );

    expect(await response.text()).toBe("network response");
    expect(fetchFromNetwork).toHaveBeenCalledTimes(1);
  });

  it("continues to serve cacheable legacy runtime content", async () => {
    const { fetchFromNetwork, response } = await respondWithRegisteredCacheFirst(
      new Response("public cache", {
        headers: { "Cache-Control": "public, max-age=60" },
      }),
    );

    expect(await response.text()).toBe("public cache");
    expect(fetchFromNetwork).not.toHaveBeenCalled();
  });
});
