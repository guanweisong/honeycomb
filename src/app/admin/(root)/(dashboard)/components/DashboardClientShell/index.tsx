"use client";

import { getMenuForCapabilities } from "@/app/admin/constants/menu-data";
import { authClient } from "@/auth-client";
import type { AdminUser } from "@/app/admin/lib/admin-auth";
import { trpc } from "@/packages/trpc/client/trpc";
import { AdminLayout } from "@/packages/ui/extended/AdminLayout";
import { useSiteSetting } from "@/features/setting/admin/hooks-use-site-setting";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  clearHoneycombRuntimeCaches,
  navigateToAdminLogin,
} from "./logout-browser-state";

function findMenuTitle(
  items: ReturnType<typeof getMenuForCapabilities>,
  pathname: string,
): string | undefined {
  for (const item of items) {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      if (item.children) {
        const childTitle = findMenuTitle(item.children, pathname);
        if (childTitle) return childTitle;
      }
      return item.name;
    }
  }
  return undefined;
}

export function DashboardClientShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AdminUser;
}) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const { setting } = useSiteSetting();
  const adminMenu = useMemo(
    () => getMenuForCapabilities(user.level),
    [user.level],
  );

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

    utils.user.current.setData(undefined, undefined);
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
