import { trpc } from "@honeycomb/trpc/client/trpc";
import type { AppRouter } from "@honeycomb/trpc/server";
import type { inferRouterOutputs } from "@trpc/server";

/**
 * 网站设置数据的类型定义。
 * 从 tRPC 路由输出中推断 `setting.index` 的数据结构。
 */
type SettingData = inferRouterOutputs<AppRouter>["setting"]["index"];

/**
 * 全局设置状态管理 Hook。
 * 使用 tRPC 查询网站设置，并提供设置数据和刷新设置的方法。
 * @returns {{ setting: SettingData | undefined; querySetting: () => void }} 包含设置数据和查询设置方法的对象。
 */
export const useSettingStore = () => {
  const { data, refetch } = trpc.setting.index.useQuery();
  return {
    setting: data as SettingData | undefined,
    querySetting: () => {
      /**
       * 刷新网站设置数据。
       */
      refetch();
    },
  };
};
