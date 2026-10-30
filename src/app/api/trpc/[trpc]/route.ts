import { appRouter } from "@/app/trpc/router";
import { createContext } from "@/lib/trpc/context";
import {
  createRequestContext,
  REQUEST_ID_HEADER,
} from "@/lib/observability/server/request-context";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

/** 为每次 HTTP 请求显式传递并回写同一个 request ID。 */
const handler = async (req: Request) => {
  const requestContext = createRequestContext({ headers: req.headers });
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ req, requestContext }),
  });
  response.headers.set(REQUEST_ID_HEADER, requestContext.requestId);
  return response;
};

/**
 * 导出 `handler` 以同时处理 GET 和 POST 请求。
 * tRPC 使用 GET 请求进行查询 (query) 和 POST 请求进行变更 (mutation)。
 */
export { handler as GET, handler as POST };
