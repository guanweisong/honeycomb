"use client";

import { menu } from "@/constants/menuData";
import { useSettingStore } from "@/stores/useSettingStore";
import { useUserStore } from "@/stores/useUserStore";
import { useRouter } from "next/navigation";
import React from "react";
import { AdminLayout } from "@honeycomb/ui/extended/AdminLayout";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { UserEntity } from "@honeycomb/trpc/server/types/user.entity";

/**
 * 后台管理界面的核心布局组件。
 * 该组件包裹了所有仪表盘下的页面（如用户管理、文章管理等），
 * 提供了统一的侧边栏、顶部导航和页脚。
 *
 * @param {{ children: React.ReactNode }} props - 包含子页面内容的 props。
 * @returns {JSX.Element} 返回一个配置好的 `AdminLayout` 组件实例。
 */
export default ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const userStore = useUserStore();
  const settingStore = useSettingStore();

  const { setting } = settingStore;
  const { user } = userStore;
  const logoutMutation = trpc.auth.logout.useMutation();

  /**
   * 处理用户登出操作。
   * 1. 调用后端的 `logout` API，并从 localStorage 中移除 token。
   * 2. 无论 API 调用成功与否，都会清空本地 token 并重定向到登录页。
   * 3. 显示成功登出的消息提示。
   */
  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      if (token) await logoutMutation.mutateAsync({ token });
      toast.success("登出成功");
    } catch (e) {
      // 即使 API 调用失败，也继续执行登出流程，确保前端状态被清理
    } finally {
      localStorage.removeItem("token");
      router.push("/login");
    }
  };

  // 使用从 @honeycomb/ui 包中导入的 AdminLayout 组件来构建 UI
  // 将菜单数据、用户信息、网站设置和登出函数作为 props 传入
  return (
    <AdminLayout
      title={setting?.siteName?.zh}
      menu={menu}
      user={user as UserEntity}
      footer={setting?.siteSignature?.zh}
      onLogout={handleLogout}
    >
      {children}
    </AdminLayout>
  );
};
