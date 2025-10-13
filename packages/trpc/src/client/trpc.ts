import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import type { AppRouter } from "../server";
import superjson from "superjson";

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
 * - `transformer`: 使用 `superjson` 进行数据序列化和反序列化。
 * - `headers`: 动态设置请求头，例如从 localStorage 获取认证 token。
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "http://127.0.0.1:7002/api/trpc",
      transformer: superjson,
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
