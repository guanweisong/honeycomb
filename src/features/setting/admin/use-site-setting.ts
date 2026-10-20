import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc/client/trpc";
import type { SettingViewModel as SettingEntity } from "@/features/setting/types";

const SiteSettingContext = createContext<{
  setting?: SettingEntity;
  refreshSetting: () => Promise<SettingEntity>;
} | null>(null);

export function SiteSettingProvider({
  children,
  setting,
}: {
  children?: ReactNode;
  setting?: SettingEntity;
}) {
  const { data: fetchedSetting } = trpc.setting.index.useQuery(undefined, {
    initialData: setting,
    staleTime: 5 * 60 * 1000,
  });
  const utils = trpc.useUtils();
  const refreshSetting = () =>
    utils.setting.index.fetch(undefined, { staleTime: 0 });

  return createContextProvider(children, fetchedSetting, refreshSetting);
}

function createContextProvider(
  children: ReactNode,
  setting: SettingEntity | undefined,
  refreshSetting: () => Promise<SettingEntity>,
) {
  return createElement(
    SiteSettingContext.Provider,
    { value: { setting, refreshSetting } },
    children,
  );
}

/**
 * 后台全局站点设置 Hook。
 * 读取 Provider 提供的设置与刷新方法；远端快照由查询缓存统一维护。
 * 无 Provider 时返回空设置与无操作刷新，不表示一次查询已成功。
 */
export const useSiteSetting = () => {
  const context = useContext(SiteSettingContext);
  return {
    setting: context?.setting,
    refreshSetting: context?.refreshSetting ?? (async () => undefined),
  };
};
