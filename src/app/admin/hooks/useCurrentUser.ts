import { trpc } from "@/packages/trpc/client/trpc";
import {
  can,
  type Permission as PermissionValue,
} from "@/packages/identity/auth/permissions";

/**
 * 后台当前用户 Hook。
 * 基于 `user.current` 暴露当前仍然有效的后台用户。
 * 该数据在服务端已完成 session 解析和数据库状态复核。
 *
 * @returns {{ user: CurrentUser | null; isLoading: boolean }} 当前登录用户和加载状态。
 */
export const useCurrentUser = () => {
  const { data, isLoading, refetch } = trpc.user.current.useQuery(undefined, {
    retry: false,
    // dashboard layout 已在服务端校验并注入当前用户，短时间内复用该快照，
    // 避免每个权限组件首次渲染都重复请求 user.current。
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    user: data ?? null,
    isLoading,
    refreshUser: refetch,
  };
};

export const useCan = (permission: PermissionValue): boolean => {
  const { user } = useCurrentUser();
  return can(user?.level, permission);
};
