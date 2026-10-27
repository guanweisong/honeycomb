"use client";

import { usePathname, useSearchParams } from "next/navigation";
import PasskeySettings from "@/features/user/admin/account-security/components/PasskeySettings";
import PasswordSettings from "@/features/user/admin/account-security/components/PasswordSettings";
import SessionSettings from "@/features/user/admin/account-security/components/SessionSettings";
import LinkedAccountsSettings from "@/features/user/admin/account-security/components/LinkedAccountsSettings";
import LoginHistorySettings from "@/features/user/admin/account-security/components/LoginHistorySettings";
import type { SocialProviderId } from "@/lib/auth/providers";
import { Tabs } from "@/components/Tabs";

const accountSecurityTabs = [
  { value: "passkey", label: "Passkey" },
  { value: "password", label: "修改密码" },
  { value: "sessions", label: "登录会话" },
  { value: "linked-accounts", label: "关联账号" },
  { value: "login-history", label: "登录历史" },
] as const;

type AccountSecurityTab = (typeof accountSecurityTabs)[number]["value"];

function getAccountSecurityTab(value: string | null): AccountSecurityTab {
  return (
    accountSecurityTabs.find((tab) => tab.value === value)?.value ?? "passkey"
  );
}

type Props = {
  socialProviders: SocialProviderId[];
};

export function AccountSecurityTabs({ socialProviders }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTab = getAccountSecurityTab(searchParams.get("tab"));

  const onTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  return (
    <Tabs
      value={selectedTab}
      onValueChange={onTabChange}
      className="w-full"
      contentClassName="pt-6"
      tabs={[
        { ...accountSecurityTabs[0], content: <PasskeySettings /> },
        { ...accountSecurityTabs[1], content: <PasswordSettings /> },
        { ...accountSecurityTabs[2], content: <SessionSettings /> },
        {
          ...accountSecurityTabs[3],
          content: <LinkedAccountsSettings providers={socialProviders} />,
        },
        { ...accountSecurityTabs[4], content: <LoginHistorySettings /> },
      ]}
    />
  );
}
/**
 * 账户安全设置选项卡，负责组合密码、Passkey、会话和登录历史设置。
 */
