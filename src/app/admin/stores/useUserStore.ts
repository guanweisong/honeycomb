import { trpc } from "@/packages/trpc/client/trpc";

/**
 * 全局用户状态管理 Hook。
 * 使用 tRPC 查询当前用户信息，并提供用户数据和刷新用户数据的方法。
 * @returns {{ user: any | undefined; queryUser: () => void }} 包含用户数据和查询用户方法的对象。
 */
export const useUserStore = () => {
  const { data, refetch } = trpc.auth.me.useQuery();
  return {
    user: data,
    queryUser: () => {
      /**
       * 刷新用户数据。
       */
      refetch();
    },
  } as const;
};
