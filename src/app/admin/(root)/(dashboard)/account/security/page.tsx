import PasskeySettings from "./PasskeySettings";
import PasswordSettings from "./PasswordSettings";
import SessionSettings from "./SessionSettings";

export default function AccountSecurityPage() {
  return (
    <div className="w-full mx-auto lg:w-[60%]">
      <PasskeySettings />
      <PasswordSettings />
      <SessionSettings />
    </div>
  );
}
