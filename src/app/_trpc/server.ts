import "server-only";

import { appRouter } from "./router";
import { createContext } from "../../lib/trpc/context";
import type { RequestContext } from "@/lib/observability/server/request-context";

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

export type { AppRouter } from "./router";
