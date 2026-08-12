import PasskeySettings from "./PasskeySettings";
import PasswordSettings from "./PasswordSettings";
import SessionSettings from "./SessionSettings";
import LinkedAccountsSettings from "./LinkedAccountsSettings";
import LoginHistorySettings from "./LoginHistorySettings";
import { Tabs } from "@/packages/ui/extended/Tabs";
import { getEnabledSocialProviders } from "@/packages/identity/auth/providers.server";

export default function AccountSecurityPage() {
  const socialProviders = getEnabledSocialProviders();

  return (
    <div className="w-full mx-auto lg:w-[60%]">
      <Tabs
        defaultValue="passkey"
        className="w-full"
        contentClassName="pt-6"
        tabs={[
          {
            value: "passkey",
            label: "Passkey",
            content: <PasskeySettings />,
          },
          {
            value: "password",
            label: "修改密码",
            content: <PasswordSettings />,
          },
          {
            value: "sessions",
            label: "登录会话",
            content: <SessionSettings />,
          },
          {
            value: "linked-accounts",
            label: "关联账号",
            content: <LinkedAccountsSettings providers={socialProviders} />,
          },
          {
            value: "login-history",
            label: "登录历史",
            content: <LoginHistorySettings />,
          },
        ]}
      />
    </div>
  );
}
