import { appRouter } from "@honeycomb/trpc/server/appRouter";
import { createContext } from "@honeycomb/trpc/server/context";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

/**
 * 强制 Next.js 将此路由视为动态路由。
 * 这对于确保每次请求都重新执行函数而不是返回缓存的响应至关重要。
 */
export const dynamic = "force-dynamic";

/**
 * tRPC 请求处理函数。
 * 使用 `@trpc/server/adapters/fetch` 提供的 `fetchRequestHandler` 来适配 Next.js 的 Fetch API。
 *
 * @param {Request} req - 来自客户端的 HTTP 请求对象。
 * @returns 一个标准的 tRPC 响应。
 *
 * 配置说明：
 * - `endpoint`: tRPC API 的基础路径。
 * - `req`: 传入的请求对象。
 * - `router`: 从 `@honeycomb/trpc` 包导入的主路由 `appRouter`。
 * - `createContext`: 用于创建每个请求上下文的函数。
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

/**
 * 导出 `handler` 以同时处理 GET 和 POST 请求。
 * tRPC 使用 GET 请求进行查询 (query) 和 POST 请求进行变更 (mutation)。
 */
export { handler as GET, handler as POST };
