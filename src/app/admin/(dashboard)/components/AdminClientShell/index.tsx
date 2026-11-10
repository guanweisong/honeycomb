"use client";

import { getMenuForCapabilities } from "@/app/admin/(dashboard)/config/menu-data";
import { authClient } from "@/lib/auth/client";
import { useCurrentUser } from "@/app/admin/(dashboard)/providers/use-current-user";
import { AdminLayout } from "@/app/admin/(dashboard)/components/AdminLayout";
import { useSiteSetting } from "@/app/admin/(dashboard)/providers/use-site-setting";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  clearHoneycombRuntimeCaches,
  navigateToAdminLogin,
} from "@/app/admin/(dashboard)/components/AdminClientShell/logout-browser-state";
import { findMenuTitle } from "@/app/admin/(dashboard)/components/AdminLayout/menu-title";

export function AdminClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const level = user?.level;
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { setting } = useSiteSetting();
  const adminMenu = useMemo(() => getMenuForCapabilities(level), [level]);

  useEffect(() => {
    const pageTitle = findMenuTitle(adminMenu, pathname) ?? "管理后台";
    const siteName = setting?.siteName?.zh;
    document.title = siteName ? `${pageTitle} - ${siteName}` : pageTitle;
  }, [adminMenu, pathname, setting?.siteName?.zh]);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const result = await authClient.signOut();
      if (result.error) {
        toast.error(result.error.message || "登出失败");
        return;
      }
    } catch {
      toast.error("登出失败");
      return;
    }

    try {
      await clearHoneycombRuntimeCaches(window.caches);
    } catch {
      // Cache Storage can be unavailable, but the server sign-out succeeded.
    }

    queryClient.clear();
    toast.success("登出成功");
    navigateToAdminLogin(window.location);
  };

  return (
    <AdminLayout
      title={setting?.siteName?.zh}
      menu={adminMenu}
      user={user}
      footer={setting?.siteSignature?.zh}
      onLogout={handleLogout}
      pendingPath={pendingPath}
      onNavigateStart={(nextPath) => {
        if (nextPath !== pathname) setPendingPath(nextPath);
      }}
    >
      {children}
    </AdminLayout>
  );
}
/**
 * Admin Dashboard 客户端壳组件，负责布局内的客户端交互和上下文组合。
 */
