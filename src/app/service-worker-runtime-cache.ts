import type { RuntimeCaching } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  RangeRequestsPlugin,
  StaleWhileRevalidate,
} from "serwist";
import { runtimeResponseCacheabilityPlugin } from "./service-worker-cache-policy";
import { isPublicRuntimeRequest } from "./service-worker-cache-rules";

const withExpiration = (maxEntries: number, maxAgeSeconds: number) => [
  runtimeResponseCacheabilityPlugin,
  new ExpirationPlugin({ maxEntries, maxAgeSeconds, maxAgeFrom: "last-used" }),
];

const matchesPublicAsset = (
  { sameOrigin, url }: Parameters<
    Exclude<RuntimeCaching["matcher"], string | RegExp>
  >[0],
  pattern: RegExp,
) => isPublicRuntimeRequest({ sameOrigin, url }) && pattern.test(url.href);

export const runtimeCache: RuntimeCaching[] = [
  {
    matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*$/i,
    handler: new CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: withExpiration(4, 365 * 24 * 60 * 60),
    }),
  },
  {
    matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
      plugins: withExpiration(4, 7 * 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) =>
      matchesPublicAsset(options, /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i),
    handler: new StaleWhileRevalidate({
      cacheName: "static-font-assets",
      plugins: withExpiration(4, 7 * 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) =>
      matchesPublicAsset(options, /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i),
    handler: new StaleWhileRevalidate({
      cacheName: "static-image-assets",
      plugins: withExpiration(64, 30 * 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) =>
      matchesPublicAsset(options, /\/_next\/static.+\.js$/i),
    handler: new CacheFirst({
      cacheName: "next-static-js-assets",
      plugins: withExpiration(64, 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) =>
      matchesPublicAsset(options, /\/_next\/image\?url=.+$/i),
    handler: new StaleWhileRevalidate({
      cacheName: "next-image",
      plugins: withExpiration(64, 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) => matchesPublicAsset(options, /\.(?:mp3|wav|ogg)$/i),
    handler: new CacheFirst({
      cacheName: "static-audio-assets",
      plugins: [...withExpiration(32, 24 * 60 * 60), new RangeRequestsPlugin()],
    }),
  },
  {
    matcher: (options) => matchesPublicAsset(options, /\.(?:mp4|webm)$/i),
    handler: new CacheFirst({
      cacheName: "static-video-assets",
      plugins: [...withExpiration(32, 24 * 60 * 60), new RangeRequestsPlugin()],
    }),
  },
  {
    matcher: (options) => matchesPublicAsset(options, /\.(?:js)$/i),
    handler: new StaleWhileRevalidate({
      cacheName: "static-js-assets",
      plugins: withExpiration(48, 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) => matchesPublicAsset(options, /\.(?:css|less)$/i),
    handler: new StaleWhileRevalidate({
      cacheName: "static-style-assets",
      plugins: withExpiration(32, 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) =>
      matchesPublicAsset(options, /\/_next\/data\/.+\/.+\.json$/i),
    handler: new NetworkFirst({
      cacheName: "next-data",
      plugins: withExpiration(32, 24 * 60 * 60),
    }),
  },
  {
    matcher: (options) => matchesPublicAsset(options, /\.(?:json|xml|csv)$/i),
    handler: new NetworkFirst({
      cacheName: "static-data-assets",
      plugins: withExpiration(32, 24 * 60 * 60),
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1" &&
      isPublicRuntimeRequest({ sameOrigin, url }),
    handler: new NetworkFirst({
      cacheName: "pages-rsc-prefetch",
      plugins: withExpiration(32, 24 * 60 * 60),
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      request.headers.get("RSC") === "1" &&
      isPublicRuntimeRequest({ sameOrigin, url }),
    handler: new NetworkFirst({
      cacheName: "pages-rsc",
      plugins: withExpiration(32, 24 * 60 * 60),
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      request.headers.get("Content-Type")?.includes("text/html") === true &&
      isPublicRuntimeRequest({ sameOrigin, url }),
    handler: new NetworkFirst({
      cacheName: "pages",
      plugins: withExpiration(32, 24 * 60 * 60),
    }),
  },
  {
    matcher: ({ sameOrigin, url }) => isPublicRuntimeRequest({ sameOrigin, url }),
    handler: new NetworkFirst({
      cacheName: "others",
      plugins: withExpiration(32, 24 * 60 * 60),
    }),
  },
  {
    matcher: ({ sameOrigin }) => !sameOrigin,
    handler: new NetworkFirst({
      cacheName: "cross-origin",
      plugins: withExpiration(32, 60 * 60),
      networkTimeoutSeconds: 10,
    }),
  },
];
