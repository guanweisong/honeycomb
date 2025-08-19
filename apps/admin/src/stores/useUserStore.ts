import { trpc } from "@honeycomb/trpc/client/trpc";
import type { AppRouter } from "@honeycomb/trpc/server";
import type { inferRouterOutputs } from "@trpc/server";

type MeData = inferRouterOutputs<AppRouter>["auth"]["me"]; // could be User | null

export const useUserStore = () => {
  const { data, refetch } = trpc.auth.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  return {
    user: (data as MeData) && (data as any)?.id ? (data as MeData) : undefined,
    queryUser: () => {
      refetch();
    },
  } as const;
};
