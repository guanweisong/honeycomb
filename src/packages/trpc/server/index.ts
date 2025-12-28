import { appRouter } from "./appRouter";
import { createContext } from "./context";

export const createServerClient = async () =>
    appRouter.createCaller(await createContext({}));

// 导出新的上下文工具函数
export { createTrpcContext } from "./defaultContext";
export type { AppRouter } from "./appRouter";
