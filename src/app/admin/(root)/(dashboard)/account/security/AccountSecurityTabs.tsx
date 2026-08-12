"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PasskeySettings from "./PasskeySettings";
import PasswordSettings from "./PasswordSettings";
import SessionSettings from "./SessionSettings";
import LinkedAccountsSettings from "./LinkedAccountsSettings";
import LoginHistorySettings from "./LoginHistorySettings";
import type { SocialProviderId } from "@/packages/identity/auth/providers";
import { Tabs } from "@/packages/ui/extended/Tabs";

const accountSecurityTabs = [
  { value: "passkey", label: "Passkey" },
  { value: "password", label: "修改密码" },
  { value: "sessions", label: "登录会话" },
  { value: "linked-accounts", label: "关联账号" },
  { value: "login-history", label: "登录历史" },
] as const;

type AccountSecurityTab = (typeof accountSecurityTabs)[number]["value"];

function getAccountSecurityTab(value: string | null): AccountSecurityTab {
  return accountSecurityTabs.some((tab) => tab.value === value)
    ? (value as AccountSecurityTab)
    : "passkey";
}

type Props = {
  socialProviders: SocialProviderId[];
};

export function AccountSecurityTabs({ socialProviders }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTab = getAccountSecurityTab(searchParams.get("tab"));

  const onTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
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
