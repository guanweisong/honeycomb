import "server-only";

import { appRouter } from "@/app/trpc/router";
import { createContext } from "@/lib/trpc/context";
import type { CreateContextOptions } from "@/lib/trpc/context";

export type ServerClientOptions = Pick<
  CreateContextOptions,
  "requestContext" | "skipRequestObservability"
>;

export const createServerClient = async (options: ServerClientOptions = {}) =>
  appRouter.createCaller(
    await createContext({
      ...options,
    }),
  );

export type { AppRouter } from "@/app/trpc/router";
