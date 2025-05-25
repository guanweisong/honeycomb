"use client";

import { menu } from "@/constants/menuData";
import { useSettingStore } from "@/stores/useSettingStore";
import { useUserStore } from "@/stores/useUserStore";
import { useRouter } from "next/navigation";
import React from "react";
import LoginService from "../login/service";
import { AdminLayout } from "@honeycomb/ui/extended/AdminLayout";
import { toast } from "sonner";

export default ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const userStore = useUserStore();
  const settingStore = useSettingStore();

  const { setting } = settingStore;
  const { user, setUser } = userStore;

  /**
   * 退出登录
   */
  const handleLogout = async () => {
    const result = await LoginService.logout();
    if (result.status === 201 && result.data.isOk) {
      toast.success("登出成功");
      localStorage.removeItem("token");
      setUser(false);
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
