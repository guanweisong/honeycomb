import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import type { AppRouter } from "@/packages/trpc/api/appRouter";

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
 *
 * 当前认证态由浏览器自动携带的 NextAuth Cookie 提供，
 * 因此这里不再需要手动拼接认证请求头。
 *
 * 注意：已移除 transformer 以支持当前运行时约束。
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
