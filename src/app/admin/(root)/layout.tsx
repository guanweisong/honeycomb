"use client";
import FullLoadingView from "@/app/admin/components/FullLoadingView";
import { useCurrentUser } from "@/app/admin/hooks/useCurrentUser";
import { useSiteSetting } from "@/app/admin/hooks/useSiteSetting";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import React, { useEffect } from "react";

/**
 * 应用的核心布局和路由守卫。
 * 该布局包裹了所有需要登录才能访问的页面以及登录页面本身。
 * 它负责处理应用的认证逻辑，并根据用户登录状态决定显示内容或进行重定向。
 *
 * @param {{ children: React.ReactNode }} props - 包含子页面的 props。
 * @returns {JSX.Element | null} 返回子页面、全局加载动画或执行重定向。
 *
 * 核心逻辑：
 * 1. 在首次挂载时同步一次网站设置。
 * 2. 使用 `user.current` 作为后台当前用户的单一事实来源。
 * 3. 当前用户加载期间显示全屏 loading，防止后台壳层闪烁。
 * 4. 根据当前用户和访问页面决定是否重定向。
 */
function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode | null {
  const router = useRouter();
  const { user, isLoading: isCurrentUserLoading } = useCurrentUser();
  const { refreshSetting } = useSiteSetting();
  const selectedLayoutSegments = useSelectedLayoutSegments();
  const isLoginPage = selectedLayoutSegments.includes("login");

  /**
   * 后台根布局首次挂载时同步一次全局 setting。
   * Session 状态由 SessionProvider 自动管理，这里不再额外手动刷新。
   */
  useEffect(() => {
    void refreshSetting();
    // 这里只在后台根布局首次挂载时同步一次 setting。
    // 把 refreshSetting 放进依赖会因为 hook 返回的函数引用变化导致重复触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCurrentUserLoading) {
      return;
    }

    if (!user && !isLoginPage) {
      return router.replace("/admin/login");
    }
  }, [isCurrentUserLoading, isLoginPage, router, user]);

  if (isCurrentUserLoading && !isLoginPage) {
    return <FullLoadingView />;
  }

  return children;
}

export default AdminRootLayout;
