import { trpc } from "@honeycomb/trpc/client/trpc";

export const useUserStore = () => {
  const { data, refetch } = trpc.auth.me.useQuery();
  return {
    user: data,
    queryUser: () => {
      refetch();
    },
  } as const;
};
