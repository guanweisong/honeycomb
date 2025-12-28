import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import type { AppRouter } from "../server/appRouter";
import { env } from "@/lib/env";

/**
 * tRPC React 客户端实例。
 * 用于在 React 组件中调用 tRPC 后端 API。
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * tRPC 客户端配置。
 * 配置了 tRPC 客户端如何与后端 API 进行通信，包括：
 * - `httpBatchLink`: 使用 HTTP 批量请求，减少网络开销。
 * - `url`: tRPC 后端 API 的地址。
 * - `headers`: 动态设置请求头，例如从 localStorage 获取认证 token。
 *
 * 注意：已移除 transformer 以支持 Edge Runtime。
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return {
          "x-auth-token": token ?? "",
        };
      },
    }),
  ],
});
