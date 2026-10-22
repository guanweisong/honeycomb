import "server-only";

import { appRouter } from "./router";
import { createContext } from "../../lib/trpc/context";
import type { CreateContextOptions } from "../../lib/trpc/context";

export type ServerClientOptions = Pick<
  CreateContextOptions,
  "requestContext" | "skipRequestObservability"
>;

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
