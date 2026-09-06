import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  SerwistPlugin,
} from "serwist";
import { Serwist, Strategy } from "serwist";
import { defaultCache } from "@serwist/turbopack/worker";
import { createStaticOfflineDocument } from "@/packages/infrastructure/pwa/offline-document";

declare const self: WorkerGlobalScope;

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

const offlineFallbackUrl = "/en/offline";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

const offlineFallbackPlugin: SerwistPlugin = {
  async handlerDidError({ request }) {
    if (request.destination !== "document") return undefined;
    const response = await serwist.matchPrecache(offlineFallbackUrl);
    return response
      ? createStaticOfflineDocument(response)
      : undefined;
  },
};

for (const entry of defaultCache) {
  if (
    entry.handler instanceof Strategy &&
    !entry.handler.plugins.some((plugin) => "handlerDidError" in plugin)
  ) {
    entry.handler.plugins.push(offlineFallbackPlugin);
  }
  serwist.registerCapture(entry.matcher, entry.handler, entry.method);
}

serwist.addEventListeners();
