"use client";

import { getMenuForCapabilities } from "@/app/admin/constants/menu-data";
import { authClient } from "@/auth-client";
import type { AdminUser } from "@/app/admin/lib/admin-auth";
import { trpc } from "@/packages/trpc/client/trpc";
import { AdminLayout } from "@/packages/ui/extended/AdminLayout";
import { useSiteSetting } from "@/features/setting/admin/hooks-use-site-setting";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

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
  const router = useRouter();
  const pathname = usePathname();
  const utils = trpc.useUtils();
  const { setting } = useSiteSetting();
  const adminMenu = useMemo(() => getMenuForCapabilities(user.level), [user.level]);

  useEffect(() => {
    const pageTitle = findMenuTitle(adminMenu, pathname) ?? "管理后台";
    const siteName = setting?.siteName?.zh;
    document.title = siteName ? `${pageTitle} - ${siteName}` : pageTitle;
  }, [adminMenu, pathname, setting?.siteName?.zh]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      utils.user.current.setData(undefined, undefined);
      await utils.user.current.invalidate();
      toast.success("登出成功");
    } catch {
      // 即使 API 调用失败，也继续执行登出流程，确保前端状态被清理。
    } finally {
      router.push("/admin/login");
    }
  };

  return (
    <AdminLayout
      title={setting?.siteName?.zh}
      menu={adminMenu}
      user={user}
      footer={setting?.siteSignature?.zh}
      onLogout={handleLogout}
    >
      {children}
    </AdminLayout>
  );
}
/**
 * Admin Dashboard 客户端壳组件，负责布局内的客户端交互和上下文组合。
 */
