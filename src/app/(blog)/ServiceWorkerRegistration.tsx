"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox;

      // A common UX pattern for progressive web apps is to show a banner when a service worker has updated and waiting to install.
      // NOTE: MUST set skipWaiting to false in next.config.js to use this
      // wb.addEventListener("waiting", (event: any) => {
      //   // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
      //   // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
      //   // You may want to customize the UI prompt accordingly.
      //   if (confirm("An update is available! Would you like to update?")) {
      //     wb.addEventListener("controlling", (event: any) => {
      //       window.location.reload();
      //     });
      //     wb.messageSkipWaiting();
      //   }
      // });

      // Add an event listener to detect when the registered
      // service worker has installed but is waiting to activate.
      wb.addEventListener("installed", (event: any) => {
        if (!event.isUpdate) {
          console.log("Service Worker installed for the first time");
        }
      });

      // Detect if the current page is served from cache.
      wb.addEventListener("controlling", (event: any) => {
        if (event.isUpdate) {
          console.log("Service Worker updated");
        }
      });

      wb.register();
    }
  }, []);

  return null;
}
