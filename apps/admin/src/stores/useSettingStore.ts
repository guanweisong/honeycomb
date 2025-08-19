import { trpc } from "@honeycomb/trpc/client/trpc";
import type { AppRouter } from "@honeycomb/trpc/server";
import type { inferRouterOutputs } from "@trpc/server";

type SettingData = inferRouterOutputs<AppRouter>["setting"]["index"];

export const useSettingStore = () => {
  const { data, refetch } = trpc.setting.index.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  return {
    setting: data as SettingData | undefined,
    querySetting: () => {
      // keep API parity: manual refetch
      refetch();
    },
  };
};
