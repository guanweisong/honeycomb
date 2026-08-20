import { trpc } from "@/packages/trpc/client/trpc";
import type { AdminUser } from "@/features/user/admin-user";
import {
  can,
  type Permission as PermissionValue,
} from "@/packages/identity/auth/permissions";
import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

const CurrentUserContext = createContext<{
  user: AdminUser | null;
  isLoading: boolean;
  refreshUser: ReturnType<typeof trpc.user.current.useQuery>["refetch"];
} | null>(null);

export function CurrentUserProvider({
  children,
  initialUser,
}: {
  children?: ReactNode;
  initialUser: AdminUser;
}) {
  const { data, isLoading, refetch } = trpc.user.current.useQuery(undefined, {
    initialData: initialUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const value = useMemo(
    () => ({ user: data ?? null, isLoading, refreshUser: refetch }),
    [data, isLoading, refetch],
  );

  return createElement(CurrentUserContext.Provider, { value }, children);
}

/**
 * 后台当前用户 Hook。
 * 基于 `user.current` 暴露当前仍然有效的后台用户。
 * 该数据在服务端已完成 session 解析和数据库状态复核。
 *
 * @returns {{ user: CurrentUser | null; isLoading: boolean }} 当前登录用户和加载状态。
 */
export const useCurrentUser = () => {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  }
  return context;
};

export const useCan = (permission: PermissionValue): boolean => {
  const { user } = useCurrentUser();
  return can(user?.level, permission);
};
