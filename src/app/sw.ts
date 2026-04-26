import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "serwist";
import { ExpirationPlugin } from "serwist";
import { Route } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Register custom caching strategies using registerRoute
// Order matters: first registered route has highest priority

// 1. Static images from CDN
serwist.registerRoute(
  new Route(
    ({ url }) => url.hostname === "static.guanweisong.com",
    new CacheFirst({
      cacheName: "static-images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  ),
);

// 2. Same-origin images
serwist.registerRoute(
  new Route(
    ({ url, sameOrigin }) =>
      sameOrigin && /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname),
    new StaleWhileRevalidate({
      cacheName: "images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    }),
  ),
);

// 3. Static resources (JS, CSS, fonts, Next.js static)
serwist.registerRoute(
  new Route(
    ({ url, sameOrigin }) =>
      sameOrigin &&
      (/\.(?:js|css|woff|woff2|ttf|otf)$/i.test(url.pathname) ||
        url.pathname.startsWith("/_next/static/")),
    new StaleWhileRevalidate({
      cacheName: "static-resources",
    }),
  ),
);

// 4. API requests
serwist.registerRoute(
  new Route(
    ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/trpc"),
    new NetworkFirst({
      cacheName: "api-trpc",
      networkTimeoutSeconds: 10,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    }),
  ),
);

// 5. Default handler for unmatched requests (fallback to StaleWhileRevalidate)
serwist.setDefaultHandler(new StaleWhileRevalidate());

serwist.addEventListeners();
