"use client";

import { getMenuForCapabilities } from "@/app/admin/constants/menu-data";
import { authClient } from "@/auth-client";
import type { AdminUser } from "@/app/admin/lib/admin-auth";
import { trpc } from "@/packages/trpc/client/trpc";
import { AdminLayout } from "@/packages/ui/extended/AdminLayout";
import { useSiteSetting } from "@/app/admin/hooks/use-site-setting";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DashboardClientShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AdminUser;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { setting } = useSiteSetting();

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
      menu={getMenuForCapabilities(user.level)}
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
