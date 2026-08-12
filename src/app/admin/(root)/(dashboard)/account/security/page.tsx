import { Suspense } from "react";
import { AccountSecurityTabs } from "./AccountSecurityTabs";
import { getEnabledSocialProviders } from "@/packages/identity/auth/providers.server";

export default function AccountSecurityPage() {
  const socialProviders = getEnabledSocialProviders();

  return (
    <div className="w-full mx-auto lg:w-[60%]">
      <Suspense fallback={null}>
        <AccountSecurityTabs socialProviders={socialProviders} />
      </Suspense>
    </div>
  );
}
