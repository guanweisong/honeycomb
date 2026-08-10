import PasskeySettings from "./PasskeySettings";
import PasswordSettings from "./PasswordSettings";
import SessionSettings from "./SessionSettings";
import { Tabs } from "@/packages/ui/extended/Tabs";

export default function AccountSecurityPage() {
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
        ]}
      />
    </div>
  );
}
