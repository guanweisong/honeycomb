import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { createTRPCClient } from "@trpc/client";
import {
  createTRPCQueryUtils,
  createTRPCReact,
  getQueryKey,
} from "@trpc/react-query";
import { observable } from "@trpc/server/observable";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/app/trpc/router";

/** Real tRPC utilities and cache; only the transport is replaced. */
export function createAdminListCache(kind: "post" | "page") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  const trpc = createTRPCReact<AppRouter>();
  let reads = 0;
  const client = createTRPCClient<AppRouter>({
    links: [
      () => () =>
        observable((observer) => {
          reads++;
          observer.next({ result: { data: { title: "Saved title" } } });
          observer.complete();
        }),
    ],
  });
  const utils = createTRPCQueryUtils({ queryClient, client });
  const inputs = [
    { page: 1, limit: 20 },
    { page: 2, limit: 20, title: "filter" },
  ];
  const keys = inputs.map((input) =>
    getQueryKey(trpc[kind].adminIndex, input, "query"),
  );
  for (const key of keys) queryClient.setQueryData(key, { title: "Old title" });
  return {
    utils,
    queryClient,
    keys,
    get reads() {
      return reads;
    },
    async readLists() {
      return Promise.all(
        inputs.map(async (input) => {
          // Remount a list observer while its original 60-second freshness window remains.
          const observer = new QueryObserver<
            inferRouterOutputs<AppRouter>["post" | "page"]["adminIndex"]
          >(queryClient, {
            queryKey: getQueryKey(trpc[kind].adminIndex, input, "query"),
            queryFn: () => client[kind].adminIndex.query(input),
            staleTime: 60_000,
          });
          const ready = Promise.withResolvers<unknown>();
          const unsubscribe = observer.subscribe((result) => {
            if (!result.isFetching) ready.resolve(result.data);
          });
          const current = observer.getCurrentResult();
          if (!current.isFetching) ready.resolve(current.data);
          try {
            return await ready.promise;
          } finally {
            unsubscribe();
          }
        }),
      );
    },
  };
}
