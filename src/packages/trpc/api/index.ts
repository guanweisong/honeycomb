import "server-only";

import { appRouter } from "./app-router";
import { createContext } from "./context";

export const createServerClient = async (headers?: Headers) =>
  appRouter.createCaller(await createContext({ req: headers ? new Request("https://honeycomb.test", { headers }) : undefined }));

// 导出新的上下文工具函数
export { createTrpcContext } from "./default-context";
export type { AppRouter } from "./app-router";
