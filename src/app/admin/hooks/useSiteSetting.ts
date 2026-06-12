import { trpc } from "@/packages/trpc/client/trpc";

/**
 * 后台全局站点设置 Hook。
 * 使用 tRPC 读取站点设置，并暴露一个刷新方法供后台布局和页面复用。
 *
 * @returns {{ setting: SettingData | undefined; isLoading: boolean; refreshSetting: () => Promise<unknown> }} 当前设置数据、加载状态和刷新方法。
 */
export const useSiteSetting = () => {
  const { data, refetch, isLoading } = trpc.setting.index.useQuery();
  return {
    setting: data,
    isLoading,
    refreshSetting: refetch,
  };
};
