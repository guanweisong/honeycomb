"use client";

import { menu } from "@/app/admin/constants/menuData";
import { useSiteSetting } from "@/app/admin/hooks/useSiteSetting";
import { useCurrentUser } from "@/app/admin/hooks/useCurrentUser";
import React from "react";
import { AdminLayout } from "@/packages/ui/extended/AdminLayout";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { trpc } from "@/packages/trpc/client/trpc";

/**
 * 后台管理界面的核心布局组件。
 * 该组件包裹了所有仪表盘下的页面（如用户管理、文章管理等），
 * 提供了统一的侧边栏、顶部导航和页脚。
 *
 * @param {{ children: React.ReactNode }} props - 包含子页面内容的 props。
 * @returns {JSX.Element} 返回一个配置好的 `AdminLayout` 组件实例。
 */
function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const { user } = useCurrentUser();
  const { setting } = useSiteSetting();
  const utils = trpc.useUtils();

  /**
   * 处理用户登出操作。
   * 1. 调用 NextAuth 的登出逻辑清理会话。
   * 2. 无论 API 调用成功与否，都会跳转回登录页。
   * 3. 显示成功登出的消息提示。
   */
  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      utils.user.current.setData(undefined, undefined);
      await utils.user.current.invalidate();
      toast.success("登出成功");
    } catch {
      // 即使 API 调用失败，也继续执行登出流程，确保前端状态被清理
    } finally {
      window.location.href = "/admin/login";
    }
  };

  return (
    <AdminLayout
      title={setting?.siteName?.zh}
      menu={menu}
      user={user}
      footer={setting?.siteSignature?.zh}
      onLogout={handleLogout}
    >
      {children}
    </AdminLayout>
  );
}

export default AdminDashboardLayout;
