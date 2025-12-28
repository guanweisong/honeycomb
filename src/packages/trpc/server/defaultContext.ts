import { createContext } from "./context";

/**
 * 创建 tRPC 上下文的工厂函数
 * 支持 Edge 和 Node 运行时环境
 * 
 * @param opts - 可选的上下文创建选项
 * @param opts.req - HTTP 请求对象，用于提取用户认证信息
 * @returns {Promise<Context>} 返回 tRPC 上下文对象
 * 
 * @example
 * // 在 API 路由中使用
 * const handler = (req: Request) =>
 *   fetchRequestHandler({
 *     endpoint: "/api/trpc",
 *     req,
 *     router: appRouter,
 *     createContext: () => createTrpcContext({ req }),
 *   });
 */
export const createTrpcContext = async (opts?: { req?: Request }) => {
    return createContext(opts ?? {});
};
