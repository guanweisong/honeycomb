"use client";

import { ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogEvent } from "@/lib/observability/core/names";
import { clientLogger } from "@/lib/observability/client";
import { trpc, trpcClient } from "@/lib/trpc/client/trpc";

/**
 * 博客提供者组件。
 * 为博客应用提供 React Query 和 tRPC 客户端实例。
 * @param {{ children: ReactNode }} { children } - 组件属性，包含子组件。
 * @returns {JSX.Element} 包含提供者的组件。
 */
export function BlogProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/serwist/sw.js", { scope: "/" })
      .catch(() => {
        // This optional enhancement must not interrupt online content. The logger is non-throwing.
        clientLogger.warn(LogEvent.serviceWorkerRegistrationFailed);
      });
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
