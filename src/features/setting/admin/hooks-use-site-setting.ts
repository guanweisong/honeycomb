import {
  createContext,
  createElement,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { trpc } from "@/packages/trpc/client/trpc";
import type { SettingViewModel as SettingEntity } from "@/features/contracts";

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
    const nextSetting = await utils.setting.index.fetch();
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
 * 使用 tRPC 读取站点设置，并暴露一个刷新方法供后台布局和页面复用。
 *
 * @returns {{ setting: SettingData | undefined; isLoading: boolean; refreshSetting: () => Promise<unknown> }} 当前设置数据、加载状态和刷新方法。
 */
export const useSiteSetting = () => {
  const context = useContext(SiteSettingContext);
  return {
    setting: context?.setting,
    isLoading: false,
    refreshSetting: context?.refreshSetting ?? (async () => undefined),
  };
};
