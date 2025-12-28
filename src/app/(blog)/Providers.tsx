"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/packages/trpc/client/trpc";

/**
 * 全局提供者组件。
 * 为整个应用提供 React Query 和 tRPC 客户端实例。
 * @param {{ children: ReactNode }} { children } - 组件属性，包含子组件。
 * @returns {JSX.Element} 包含提供者的组件。
 */
export function Providers({ children }: { children: ReactNode }) {
  /**
   * React Query 客户端实例。
   */
  const queryClient = new QueryClient();

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
