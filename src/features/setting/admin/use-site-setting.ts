import {
  createContext,
  createElement,
  useContext,
  useState,
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
  const [currentSetting, setCurrentSetting] = useState<
    SettingEntity | undefined
  >(fetchedSetting);
  const utils = trpc.useUtils();
  const resolvedSetting = fetchedSetting ?? currentSetting;
  const refreshSetting = async () => {
    const nextSetting = await utils.setting.index.fetch(undefined, {
      staleTime: 0,
    });
    setCurrentSetting(nextSetting);
    return nextSetting;
  };

  return createContextProvider(children, resolvedSetting, refreshSetting);
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
 * 读取 Provider 提供的设置与刷新方法；查询由 Provider 负责，此处 isLoading 固定为 false。
 * 无 Provider 时返回空设置与无操作刷新，不表示一次查询已成功。
 */
export const useSiteSetting = () => {
  const context = useContext(SiteSettingContext);
  return {
    setting: context?.setting,
    isLoading: false,
    refreshSetting: context?.refreshSetting ?? (async () => undefined),
  };
};
