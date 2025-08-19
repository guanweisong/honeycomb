"use client";

import { menu } from "@/constants/menuData";
import { useSettingStore } from "@/stores/useSettingStore";
import { useUserStore } from "@/stores/useUserStore";
import { useRouter } from "next/navigation";
import React from "react";
import { AdminLayout } from "@honeycomb/ui/extended/AdminLayout";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";

export default ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const userStore = useUserStore();
  const settingStore = useSettingStore();

  const { setting } = settingStore;
  const { user } = userStore;
  const logoutMutation = trpc.auth.logout.useMutation();

  /**
   * 退出登录
   */
  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      if (token) await logoutMutation.mutateAsync({ token });
      toast.success("登出成功");
      router.push("/login");
    } catch (e) {
      // ignore error and still clear local state
    } finally {
      localStorage.removeItem("token");
      router.push("/login");
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
};
