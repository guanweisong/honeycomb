import PasskeySettings from "./PasskeySettings";
import PasswordSettings from "./PasswordSettings";
import SessionSettings from "./SessionSettings";

export default function AccountSecurityPage() {
  return (
    <div className="w-[60%] mx-auto">
      <PasskeySettings />
      <PasswordSettings />
      <SessionSettings />
    </div>
  );
}
