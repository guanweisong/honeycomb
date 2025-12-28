"use client";
import FullLoadingView from "@/app/admin/components/FullLoadingView";
import { useSettingStore } from "@/app/admin/stores/useSettingStore";
import { useUserStore } from "@/app/admin/stores/useUserStore";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import React, { useEffect, useLayoutEffect } from "react";

/**
 * 应用的核心布局和路由守卫。
 * 该布局包裹了所有需要登录才能访问的页面以及登录页面本身。
 * 它负责处理应用的认证逻辑，并根据用户登录状态决定显示内容或进行重定向。
 *
 * @param {{ children: React.ReactNode }} props - 包含子页面的 props。
 * @returns {JSX.Element | null} 返回子页面、全局加载动画或执行重定向。
 *
 * 核心逻辑：
 * 1. **状态管理**: 使用 Zustand (`useUserStore`, `useSettingStore`) 来管理全局的用户和设置状态。
 * 2. **数据获取**: 在 `useLayoutEffect` 中，组件首次加载时异步获取当前用户信息和网站设置。
 * 3. **加载状态**: 在用户信息 (`user`) 未确定（`undefined`）时，显示一个全屏的加载动画，防止页面闪烁。
 * 4. **认证守卫**:
 *    - 如果用户 **已登录** (`user` 为真) 并且当前处于登录页，则自动重定向到 `/dashboard`。
 *    - 如果用户 **未登录** (`user` 为假) 并且当前不在登录页，则自动重定向到 `/login`。
 * 5. **内容渲染**: 如果通过了所有检查，则正常渲染 `children`，即当前应该显示的页面。
 */
export default ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode | null => {
  const router = useRouter();
  const userStore = useUserStore();
  const settingStore = useSettingStore();
  const selectedLayoutSegments = useSelectedLayoutSegments();

  const { user, queryUser } = userStore;
  const { querySetting } = settingStore;

  const isLoginPage = selectedLayoutSegments.includes("login");

  useLayoutEffect(() => {
    Promise.all([queryUser(), querySetting()]);
  }, []);

  useEffect(() => {
    if (typeof user === "undefined") {
    } else if (user) {
      // 用户已登录
      if (isLoginPage) {
        // 如果已登录但访问的是登录页，重定向到主看板
        return router.replace("/admin/dashboard");
      }
    } else {
      // 用户未登录
      if (!isLoginPage) {
        // 如果未登录但访问的不是登录页，重定向到登录页
        return router.replace("/admin/login");
      }
    }
  }, [user]);

  // 用户信息仍在加载中，显示全屏加载动画
  if (typeof user === "undefined") {
    return <FullLoadingView />;
  }

  // 所有检查通过，渲染子页面
  return children;
};
