import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";
import { createStaticOfflineDocument } from "@/lib/pwa/offline-document";
import { offlinePrecacheUrl } from "@/lib/pwa/precache-config";
import { createRuntimeCache } from "@/app/(blog)/pwa/service-worker-runtime-cache";

declare const self: WorkerGlobalScope;

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

const serwist: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: createRuntimeCache({
    async handlerDidError() {
      const response = await serwist.matchPrecache(offlinePrecacheUrl);
      return response ? createStaticOfflineDocument(response) : undefined;
    },
  }),
});

serwist.addEventListeners();
