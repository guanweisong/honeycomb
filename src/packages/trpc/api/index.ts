import "server-only";

import { appRouter } from "./app-router";
import { createContext } from "./context";
import type { RequestContext } from "@/packages/infrastructure/observability/server/request-context";

export interface ServerClientOptions {
  requestContext?: RequestContext;
  skipRequestObservability?: boolean;
}

export const createServerClient = async (
  headers?: Headers,
  options: ServerClientOptions = {},
) =>
  appRouter.createCaller(
    await createContext({
      req: headers
        ? new Request("https://honeycomb.test", { headers })
        : undefined,
      ...options,
    }),
  );

// 导出新的上下文工具函数
export { createTrpcContext } from "./default-context";
export type { AppRouter } from "./app-router";
