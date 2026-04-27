import { trpc } from "@/packages/trpc/client/trpc";

/**
 * 后台当前用户 Hook。
 * 基于 `user.current` 暴露当前仍然有效的后台用户。
 * 该数据在服务端已完成 session 解析和数据库状态复核。
 *
 * @returns {{ user: CurrentUser | null; isLoading: boolean }} 当前登录用户和加载状态。
 */
export const useCurrentUser = () => {
  const { data, isLoading } = trpc.user.current.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    user: data ?? null,
    isLoading,
  };
};
