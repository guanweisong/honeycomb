import { Suspense } from "react";
import { AccountSecurityTabs } from "@/features/user/admin/account-security/components/AccountSecurityTabs";
import { getEnabledSocialProviders } from "@/lib/auth/providers.server";
import LoadingState from "@/components/LoadingState";

export default function AccountSecurityPage() {
  const socialProviders = getEnabledSocialProviders();

  return (
    <div className="w-full mx-auto lg:w-[60%]">
      <Suspense fallback={<LoadingState variant="region" />}>
        <AccountSecurityTabs socialProviders={socialProviders} />
      </Suspense>
    </div>
  );
}
